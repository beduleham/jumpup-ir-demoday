-- 참가자 일회성 초대 토큰. 운영진이 발급한 링크(/?token=...)로 접속하면
-- 서버가 consume_invitation_token으로 검증·소비하고 세션을 개설한다.

create table public.invitation_tokens (
    -- 추측할 수 없는 길이를 DB에서도 강제한다.
    token text primary key check (length(token) >= 32),
    investor_id uuid not null references public.investors (id) on delete cascade,
    expires_at timestamptz not null,
    used_at timestamptz,
    created_at timestamptz not null default now()
);

create index idx_invitation_tokens_investor_id on public.invitation_tokens (investor_id);

alter table public.invitation_tokens enable row level security;

-- 브라우저 역할에는 권한도 정책도 없다. 발급·조회·폐기는 서버(service_role)만 한다.
revoke all on public.invitation_tokens from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.invitation_tokens to service_role;

-- 토큰을 원자적으로 검증하고 사용 처리한다. 같은 토큰으로 동시에 들어와도 한 번만 성공한다.
create function public.consume_invitation_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_investor_id uuid;
    v_expires_at timestamptz;
    v_used_at timestamptz;
    v_investor jsonb;
begin
    select t.investor_id, t.expires_at, t.used_at
    into v_investor_id, v_expires_at, v_used_at
    from public.invitation_tokens as t
    where t.token = p_token
    for update;

    if not found then
        return jsonb_build_object('success', false, 'code', 'INVALID_TOKEN', 'message', '유효하지 않은 토큰입니다.');
    end if;

    if v_used_at is not null then
        return jsonb_build_object('success', false, 'code', 'ALREADY_USED', 'message', '이미 사용된 토큰입니다.');
    end if;

    if v_expires_at <= now() then
        return jsonb_build_object('success', false, 'code', 'EXPIRED_TOKEN', 'message', '만료된 토큰입니다.');
    end if;

    update public.invitation_tokens as t
    set used_at = now()
    where t.token = p_token;

    -- 연락처는 돌려주지 않는다. 세션에 담을 표시 정보만 꺼낸다.
    select jsonb_build_object(
        'investor_id', i.id,
        'investor_no', i.investor_no,
        'investor_name', i.investor_name,
        'investor_type', i.investor_type,
        'team_id', i.team_id,
        'company_name', tm.company_name
    )
    into v_investor
    from public.investors as i
    left join public.teams as tm on tm.id = i.team_id
    where i.id = v_investor_id;

    return jsonb_build_object('success', true, 'data', v_investor);
end;
$$;

revoke all on function public.consume_invitation_token(text) from public, anon, authenticated;
grant execute on function public.consume_invitation_token(text) to service_role;
