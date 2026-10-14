import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import LandingPage from "./features/landing/LandingPage";
import "./index.css";
import "./guestbook.css";

const Guestbook = lazy(() => import("./App"));
const isGuestbook = /^\/guestbook\/?$/.test(window.location.pathname);

if (isGuestbook) document.title = "방명록 · 함께 남기는 작은 인사";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isGuestbook ? (
      <Suspense
        fallback={
          <p role="status" className="Guestbook__Main">
            방명록을 불러오고 있어요.
          </p>
        }
      >
        <Guestbook />
      </Suspense>
    ) : (
      <LandingPage />
    )}
  </StrictMode>,
);
