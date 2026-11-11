-- 핵심 스키마(settings, teams, investors, investments)와 투자 검증 RPC.
-- 쓰기는 전부 서버(service_role)를 거친다. 브라우저 역할(anon, authenticated)에는
-- 공개해도 되는 열의 읽기 권한만 준다.

-- ---------------------------------------------------------------------------
-- 1. 테이블
-- ---------------------------------------------------------------------------

-- 참여 기업
create table public.teams (
    id uuid primary key default gen_random_uuid(),
    team_no integer not null unique check (team_no between 1 and 99),
    company_name text not null,
    leader_name text not null,
    phone text not null unique,
    description text not null default '',
    note text not null default '',
    display_order integer not null default 0,
    manual_rank_override integer check (manual_rank_override > 0),
    created_at timestamptz not null default now()
);

-- 대회 전역 설정 (단일 행 상태 머신)
create table public.settings (
    id uuid primary key default gen_random_uuid(),
    status text not null default 'ready'
        check (status in ('ready', 'pitching', 'open', 'closed', 'revealed')),
    current_pitch_team_id uuid
        constraint fk_settings_current_pitch_team references public.teams (id) on delete set null,
    reveal_step integer not null default 0 check (reveal_step between 0 and 6),
    budget_units integer not null default 10 check (budget_units > 0),
    max_units_per_team integer not null default 0 check (max_units_per_team >= 0),
    require_full_spend boolean not null default false,
    min_teams_to_invest integer not null default 0 check (min_teams_to_invest >= 0),
    show_live_totals boolean not null default false,
    updated_at timestamptz not null default now()
);

-- 상수 식에 대한 유니크 인덱스로 행이 하나만 존재하도록 강제한다.
create unique index uq_settings_single_row on public.settings ((true));
create index idx_settings_current_pitch_team_id on public.settings (current_pitch_team_id);

-- 투자자: 참여 기업 대표(founder, 1~99번)와 외부 심사위원(external, 101번~)
create table public.investors (
    id uuid primary key default gen_random_uuid(),
    investor_no integer not null unique,
    investor_name text not null,
    phone text not null unique,
    investor_type text not null check (investor_type in ('founder', 'external')),
    team_id uuid references public.teams (id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint chk_investor_team_consistency check (
        (investor_type = 'founder' and team_id is not null)
        or (investor_type = 'external' and team_id is null)
    ),
    constraint chk_investor_no_range check (
        (investor_type = 'founder' and investor_no between 1 and 99)
        or (investor_type = 'external' and investor_no >= 101)
    )
);

create index idx_investors_team_id on public.investors (team_id);

-- 가상 투자 배분 원장 (투자자 × 기업당 한 행, 단위: 1억 원)
create table public.investments (
    id uuid primary key default gen_random_uuid(),
    investor_id uuid not null references public.investors (id) on delete cascade,
    team_id uuid not null references public.teams (id) on delete cascade,
    amount_units integer not null check (amount_units >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uq_investor_team unique (investor_id, team_id)
);

-- investor_id 조회는 uq_investor_team 인덱스가 담당한다.
create index idx_investments_team_id on public.investments (team_id);

insert into public.settings (status) values ('ready');

-- ---------------------------------------------------------------------------
-- 2. RLS와 권한
-- ---------------------------------------------------------------------------

alter table public.settings enable row level security;
alter table public.teams enable row level security;
alter table public.investors enable row level security;
alter table public.investments enable row level security;

revoke all on public.settings from public, anon, authenticated, service_role;
revoke all on public.teams from public, anon, authenticated, service_role;
revoke all on public.investors from public, anon, authenticated, service_role;
revoke all on public.investments from public, anon, authenticated, service_role;

-- 서버 전용 역할: 등록·진행 제어·집계를 담당한다(RLS 우회 역할).
grant select, insert, update, delete on public.teams to service_role;
grant select, insert, update, delete on public.investors to service_role;
grant select, insert, update, delete on public.investments to service_role;
-- settings는 단일 행을 유지해야 하므로 추가·삭제는 허용하지 않는다.
grant select, update on public.settings to service_role;

-- settings: 누구나 대회 진행 상태를 읽을 수 있다(의도된 공개 읽기).
grant select on public.settings to anon, authenticated;
create policy settings_public_read on public.settings
    for select to anon, authenticated using (true);

-- teams: 공개 소개 정보만 읽을 수 있다. phone은 참가자 본인 확인 수단이고
-- note·manual_rank_override는 운영 정보이므로 브라우저 역할에 주지 않는다.
grant select (id, team_no, company_name, leader_name, description, display_order, created_at)
    on public.teams to anon, authenticated;
create policy teams_public_read on public.teams
    for select to anon, authenticated using (true);

-- investors, investments: 브라우저 역할에는 권한도 정책도 없다.
-- 연락처와 공개 전 투자 집계가 새지 않도록 서버만 접근한다.

-- ---------------------------------------------------------------------------
-- 3. 투자 배분 RPC
-- ---------------------------------------------------------------------------

-- 한 투자자가 한 기업에 배분한 금액을 p_target_units(억 원)로 맞춘다.
-- 호출자는 세션을 검증한 서버(service_role)뿐이며, p_investor_id는 서버가 세션에서 꺼낸 값이다.
create function public.set_investment(
    p_investor_id uuid,
    p_team_id uuid,
    p_target_units integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_status text;
    v_budget_units integer;
    v_max_units_per_team integer;
    v_investor_type text;
    v_investor_team_id uuid;
    v_current_team_units integer;
    v_current_total integer;
begin
    if p_investor_id is null or p_team_id is null or p_target_units is null then
        raise exception '투자자, 대상 기업, 투자 금액을 모두 지정해야 합니다.';
    end if;

    if p_target_units < 0 then
        raise exception '투자 금액은 0 이상이어야 합니다.';
    end if;

    -- 공유 잠금: 이 트랜잭션이 끝나기 전에는 투자 마감(settings 갱신)이 끼어들지 못한다.
    select s.status, s.budget_units, s.max_units_per_team
    into v_status, v_budget_units, v_max_units_per_team
    from public.settings as s
    limit 1
    for share;

    if v_status is null or v_status <> 'open' then
        raise exception '현재는 투자 오픈 상태가 아닙니다.';
    end if;

    -- 투자자 행 잠금: 같은 투자자의 동시 요청(연타, 다중 기기)을 한 줄로 세운다.
    -- investments 행만 잠그면 아직 투자 내역이 없는 투자자의 동시 요청이 서로를 보지 못한다.
    select i.investor_type, i.team_id
    into v_investor_type, v_investor_team_id
    from public.investors as i
    where i.id = p_investor_id
    for update;

    if not found then
        raise exception '유효하지 않은 투자자입니다.';
    end if;

    if not exists (select 1 from public.teams as t where t.id = p_team_id) then
        raise exception '대상 기업이 존재하지 않습니다.';
    end if;

    if v_investor_type = 'founder' and v_investor_team_id = p_team_id then
        raise exception '자기 소속 기업에는 투자할 수 없습니다.';
    end if;

    if v_max_units_per_team > 0 and p_target_units > v_max_units_per_team then
        raise exception '단일 기업 최대 투자 한도(%억 원)를 초과할 수 없습니다.', v_max_units_per_team;
    end if;

    select
        coalesce(sum(inv.amount_units) filter (where inv.team_id = p_team_id), 0),
        coalesce(sum(inv.amount_units), 0)
    into v_current_team_units, v_current_total
    from public.investments as inv
    where inv.investor_id = p_investor_id;

    if v_current_total - v_current_team_units + p_target_units > v_budget_units then
        raise exception '가상 투자금 한도(%억 원)를 초과할 수 없습니다.', v_budget_units;
    end if;

    if p_target_units = 0 then
        delete from public.investments as inv
        where inv.investor_id = p_investor_id and inv.team_id = p_team_id;
    else
        insert into public.investments (investor_id, team_id, amount_units)
        values (p_investor_id, p_team_id, p_target_units)
        on conflict (investor_id, team_id)
        do update set amount_units = excluded.amount_units, updated_at = now();
    end if;

    v_current_total := v_current_total - v_current_team_units + p_target_units;

    return jsonb_build_object(
        'success', true,
        'investor_id', p_investor_id,
        'team_id', p_team_id,
        'allocated_units', p_target_units,
        'total_invested_units', v_current_total,
        'remaining_units', v_budget_units - v_current_total
    );
end;
$$;

revoke all on function public.set_investment(uuid, uuid, integer)
    from public, anon, authenticated;
grant execute on function public.set_investment(uuid, uuid, integer) to service_role;

-- ---------------------------------------------------------------------------
-- 4. 리허설 초기화 RPC
-- ---------------------------------------------------------------------------

-- 기업·투자자 명단은 그대로 두고 투자 원장만 비운 뒤 대회를 준비 상태로 되돌린다.
create function public.reset_investments_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
    -- settings를 먼저 잠근다. 진행 중인 set_investment(공유 잠금)가 끝나기를 기다리므로
    -- 초기화 직후에 뒤늦은 투자가 기록되지 않고, 잠금 순서가 같아 교착도 생기지 않는다.
    update public.settings
    set status = 'ready',
        current_pitch_team_id = null,
        reveal_step = 0,
        updated_at = now()
    where true;

    delete from public.investments where true;

    return jsonb_build_object('success', true, 'message', '투자 데이터가 성공적으로 초기화되었습니다.');
end;
$$;

revoke all on function public.reset_investments_data() from public, anon, authenticated;
grant execute on function public.reset_investments_data() to service_role;
