# Password reset email setup

K-Connect sends reset codes through the Resend email API. The reset feature cannot send mail until both settings below are added to `backend/.env`:

```env
RESEND_API_KEY=re_your_sending_key
EMAIL_FROM=K-Connect <no-reply@your-verified-domain.com>
```

1. Create a Resend account and add a sending domain you control.
2. Complete the DNS verification Resend requests for that domain.
3. Create a sending-only API key and put it in `RESEND_API_KEY`.
4. Set `EMAIL_FROM` to an address on the verified domain.
5. Save `backend/.env`, then restart the backend process.
6. Use Forgot Password with an account email and check its inbox and spam folder.

Never put the API key in frontend files or commit it. The backend loads `backend/.env` based on the server file location, so it also works when the backend is started from the repository root.

Resend setup: https://resend.com/docs
