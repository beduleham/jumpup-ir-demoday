-- 관리자 콘솔용 함수. 모두 서버(service_role)만 실행한다.
-- SECURITY INVOKER라서 실행 권한이 새더라도 호출자의 테이블 권한을 넘어서지 못한다.

-- ---------------------------------------------------------------------------
-- 1. 참가자 일괄 등록 (한 트랜잭션: 한 행이라도 실패하면 전부 취소)
-- ---------------------------------------------------------------------------
-- p_rows: [{ line, no, company_name, leader_name, phone, description, note }, ...]
--   no 1~99  → 기업 + 그 기업 대표(같은 번호의 founder 투자자)
--   no 101~  → 외부 심사위원(external 투자자)
-- 같은 번호가 이미 있으면 내용을 갱신한다.
create function public.admin_bulk_register(p_rows jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
    v_row jsonb;
    v_line integer;
    v_no integer;
    v_phone text;
    v_team_id uuid;
    v_conflict integer;
    v_teams integer := 0;
    v_investors integer := 0;
begin
    for v_row in select value from jsonb_array_elements(p_rows)
    loop
        v_line := (v_row ->> 'line')::integer;
        v_no := (v_row ->> 'no')::integer;
        v_phone := v_row ->> 'phone';
        v_team_id := null;

        if v_no between 1 and 99 then
            select t.team_no into v_conflict
            from public.teams as t
            where t.phone = v_phone and t.team_no <> v_no;
            if found then
                raise exception '%행: 전화번호 %는 이미 %번 기업에 등록되어 있습니다.', v_line, v_phone, v_conflict;
            end if;

            insert into public.teams (team_no, company_name, leader_name, phone, description, note, display_order)
            values (
                v_no,
                v_row ->> 'company_name',
                v_row ->> 'leader_name',
                v_phone,
                coalesce(v_row ->> 'description', ''),
                coalesce(v_row ->> 'note', ''),
                v_no
            )
            on conflict (team_no) do update set
                company_name = excluded.company_name,
                leader_name = excluded.leader_name,
                phone = excluded.phone,
                description = excluded.description,
                note = excluded.note
            returning id into v_team_id;
            v_teams := v_teams + 1;
        elsif v_no < 101 then
            raise exception '%행: 순번 %은 사용할 수 없습니다. 기업은 1~99, 외부 심사위원은 101 이상입니다.', v_line, v_no;
        end if;

        select i.investor_no into v_conflict
        from public.investors as i
        where i.phone = v_phone and i.investor_no <> v_no;
        if found then
            raise exception '%행: 전화번호 %는 이미 %번 투자자에 등록되어 있습니다.', v_line, v_phone, v_conflict;
        end if;

        insert into public.investors (investor_no, investor_name, phone, investor_type, team_id)
        values (
            v_no,
            v_row ->> 'leader_name',
            v_phone,
            case when v_team_id is null then 'external' else 'founder' end,
            v_team_id
        )
        on conflict (investor_no) do update set
            investor_name = excluded.investor_name,
            phone = excluded.phone,
            investor_type = excluded.investor_type,
            team_id = excluded.team_id;
        v_investors := v_investors + 1;
    end loop;

    return jsonb_build_object(
        'registered_teams_count', v_teams,
        'registered_investors_count', v_investors
    );
end;
$$;

revoke all on function public.admin_bulk_register(jsonb) from public, anon, authenticated;
grant execute on function public.admin_bulk_register(jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 2. 대시보드 집계 (기업별 유치 현황, 투자자별 배분 현황)
-- ---------------------------------------------------------------------------
-- 행 수 제한(API 기본 1000행)에 걸리지 않도록 DB에서 집계해 JSON 하나로 돌려준다.
create function public.admin_dashboard_data()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
    select jsonb_build_object(
        'teams', coalesce((
            select jsonb_agg(to_jsonb(x) order by x.team_no)
            from (
                select
                    t.id, t.team_no, t.company_name, t.leader_name, t.phone, t.description, t.note,
                    t.manual_rank_override,
                    coalesce(sum(inv.amount_units), 0)::integer as total_raised_units,
                    count(inv.id)::integer as investor_count,
                    coalesce(sum(inv.amount_units) filter (where i.investor_type = 'external'), 0)::integer
                        as external_raised_units
                from public.teams as t
                left join public.investments as inv on inv.team_id = t.id and inv.amount_units > 0
                left join public.investors as i on i.id = inv.investor_id
                group by t.id
            ) as x
        ), '[]'::jsonb),
        'investors', coalesce((
            select jsonb_agg(to_jsonb(y) order by y.investor_no)
            from (
                select
                    i.id, i.investor_no, i.investor_name, i.phone, i.investor_type, i.team_id,
                    coalesce(sum(inv.amount_units), 0)::integer as allocated_units
                from public.investors as i
                left join public.investments as inv on inv.investor_id = i.id
                group by i.id
            ) as y
        ), '[]'::jsonb)
    );
$$;

revoke all on function public.admin_dashboard_data() from public, anon, authenticated;
grant execute on function public.admin_dashboard_data() to service_role;

-- ---------------------------------------------------------------------------
-- 3. CSV 내보내기용 투자 원장 전체
-- ---------------------------------------------------------------------------
create function public.admin_investment_rows()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
    select coalesce(
        jsonb_agg(jsonb_build_object(
            'investor_id', inv.investor_id,
            'team_id', inv.team_id,
            'amount_units', inv.amount_units
        )),
        '[]'::jsonb
    )
    from public.investments as inv
    where inv.amount_units > 0;
$$;

revoke all on function public.admin_investment_rows() from public, anon, authenticated;
grant execute on function public.admin_investment_rows() to service_role;

-- ---------------------------------------------------------------------------
-- 4. 리허설 초기화 보강: 수동 순위도 함께 지운다
-- ---------------------------------------------------------------------------
-- 수동 순위는 리허설 결과를 보고 넣은 값이라, 남겨 두면 본 행사 순위를 조용히 바꿔 버린다.
create or replace function public.reset_investments_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
    -- settings를 먼저 잠근다(진행 중인 set_investment가 끝나기를 기다리고, 잠금 순서를 맞춘다).
    update public.settings
    set status = 'ready',
        current_pitch_team_id = null,
        reveal_step = 0,
        updated_at = now()
    where true;

    delete from public.investments where true;

    update public.teams
    set manual_rank_override = null
    where manual_rank_override is not null;

    return jsonb_build_object('success', true, 'message', '투자 데이터가 성공적으로 초기화되었습니다.');
end;
$$;

revoke all on function public.reset_investments_data() from public, anon, authenticated;
grant execute on function public.reset_investments_data() to service_role;
