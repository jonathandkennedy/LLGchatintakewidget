import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <h1>IntakeLLG</h1>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
