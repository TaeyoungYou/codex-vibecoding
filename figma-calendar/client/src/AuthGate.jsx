import { useCallback, useEffect, useRef, useState } from 'react';

let scriptPromise;
export function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    const failed = () => {
      clearTimeout(timer);
      script.remove();
      scriptPromise = null;
      reject(new Error('CAPTCHA 스크립트를 불러오지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.'));
    };
    const timer = setTimeout(failed, 20000);
    script.onerror = failed;
    script.onload = () => { if (!window.turnstile) return failed(); clearTimeout(timer); resolve(window.turnstile); };
    document.head.append(script);
  });
  return scriptPromise;
}

export function Turnstile({ siteKey, onToken, onError }) {
  const container = useRef();
  const [compact, setCompact] = useState(() => window.innerWidth <= 520);
  useEffect(() => {
    const resized = () => setCompact(window.innerWidth <= 520);
    window.addEventListener('resize', resized);
    return () => window.removeEventListener('resize', resized);
  }, []);
  useEffect(() => {
    let stopped = false;
    let widget;
    let provider;
    void loadTurnstile().then((turnstile) => {
      if (stopped) return;
      provider = turnstile;
      onToken('');
      widget = turnstile.render(container.current, {
        sitekey: siteKey, size: compact ? 'compact' : 'normal', theme: 'light', language: 'ko',
        'response-field': false,
        callback: (token) => { if (!stopped) onToken(token); },
        'expired-callback': () => { if (!stopped) { onToken(''); onError('CAPTCHA가 만료되었습니다. 다시 완료해 주세요.'); } },
        'error-callback': () => { if (!stopped) { onToken(''); onError('CAPTCHA 검증을 완료하지 못했습니다. 다시 시도해 주세요.'); } },
      });
    }).catch((error) => { if (!stopped) onError(error.message); });
    return () => { stopped = true; if (widget !== undefined) provider.remove(widget); };
  }, [siteKey, onToken, onError, compact]);
  return <div ref={container} className="AuthGate__Widget" aria-label="CAPTCHA 확인" />;
}

export function AuthGate({ api, status, siteKey, onAuthenticated, Widget = Turnstile }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const mutation = useRef(false);
  const alive = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const failed = useCallback((message) => { setToken(''); setError(message); }, []);

  async function start(event) {
    event.preventDefault();
    if (!token || mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setError('');
    const submitted = token;
    setToken('');
    try { await api.signIn(submitted); onAuthenticated(); }
    catch (failure) { if (alive.current) { setError(failure.message); setRevision((value) => value + 1); } }
    finally { mutation.current = false; if (alive.current) setBusy(false); }
  }

  return <section className="AuthGate" aria-labelledby="auth-heading" aria-busy={busy || status === 'checking'}>
    <p className="AuthGate__Eyebrow">SHARED CALENDAR</p>
    <h2 id="auth-heading" className="AuthGate__Heading">캘린더 시작하기</h2>
    <p className="AuthGate__Description">CAPTCHA를 완료하면 공유 캘린더를 사용할 수 있습니다. 인증은 최대 1시간 유지됩니다.</p>
    {status === 'checking' ? <p role="status">인증 상태를 확인하는 중입니다…</p>
      : status === 'unavailable' ? <>
        <p className="AuthGate__Error" role="alert">인증 서비스에 연결하지 못했습니다. 작성 중인 내용은 유지됩니다.</p>
        <button className="AuthGate__RetryButton" type="button" onClick={() => { void api.session(true).catch(() => {}); }}>연결 다시 확인</button>
      </> : <form className="AuthGate__Form" onSubmit={start}>
        {siteKey && <Widget key={revision} siteKey={siteKey} onToken={setToken} onError={failed} />}
        <p className="AuthGate__Error" role="alert" hidden={!error}>{error}</p>
        <button className="AuthGate__StartButton" type="submit" disabled={!token || busy}>{busy ? '인증 중…' : '익명으로 시작'}</button>
        {error && <button className="AuthGate__RetryButton" type="button" disabled={busy} onClick={() => { setToken(''); setError(''); setRevision((value) => value + 1); }}>CAPTCHA 다시 시도</button>}
      </form>}
  </section>;
}
