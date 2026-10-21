export default function GoogleLoginButton() {
    return (
        <a
            href="/auth/google"
            className="btn btn-google-login fw-semibold py-2 w-100"
        >
            <svg
                className="google-login-icon"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 18 18"
                width="18"
                height="18"
                aria-hidden="true"
                focusable="false"
            >
                <path fill="#4285F4" d="M17.64 9.2045c0-.6382-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436a4.14 4.14 0 0 1-1.7973 2.7164v2.2582h2.9091c1.7027-1.5682 2.6846-3.8773 2.6846-6.6155z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.4682-.8064 5.9591-2.18l-2.9091-2.2582c-.8064.54-1.8368.8591-3.05.8591-2.3455 0-4.3291-1.5818-5.0382-3.7091H.9545v2.33C2.4382 15.9655 5.4818 18 9 18z" />
                <path fill="#FBBC05" d="M3.9618 10.7118A5.41 5.41 0 0 1 3.6818 9c0-.5932.1023-1.1682.28-1.7118v-2.33H.9545A9 9 0 0 0 0 9c0 1.4523.3477 2.825  .9545 4.041l3.0073-2.3292z" />
                <path fill="#EA4335" d="M9 3.5795c1.3227 0 2.5091.4546 3.4432 1.3478l2.5818-2.5818C13.4636.9 11.4255 0 9 0 5.4818 0 2.4382 2.0345.9545 4.9582l3.0073 2.33C4.6709 5.1614 6.6545 3.5795 9 3.5795z" />
            </svg>
            <span>Continue with Google</span>
        </a>
    );
}
