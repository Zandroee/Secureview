export default function GoogleLoginButton() {
    return (
        <a
            href="/auth/google"
            className="btn btn-google-login fw-semibold py-2 w-100"
        >
            <svg
                className="google-login-icon"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                aria-hidden="true"
                focusable="false"
            >
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.75 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.05-3.71 1.05-2.86 0-5.29-1.93-6.16-4.53H2.15v2.84C3.96 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09A6.8 6.8 0 0 1 5.48 12c0-.73.13-1.43.36-2.09V7.07H2.15A11 11 0 0 0 1 12c0 1.78.43 3.46 1.15 4.93l3.69-2.84z" />
                <path fill="#EA4335" d="M12 4.37c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.96 2.47 2.15 7.07l3.69 2.84C6.71 7.3 9.14 4.37 12 4.37z" />
            </svg>
            <span>Continue with Google</span>
        </a>
    );
}
