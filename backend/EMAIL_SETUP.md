# Password reset email setup with Gmail

K-Connect sends password reset codes through Gmail SMTP using Nodemailer. Configure these values in `backend/.env`:

```env
GMAIL_USER=yourgmail@gmail.com
GMAIL_APP_PASSWORD=your16characterapppassword
```

1. In the Google Account used to send K-Connect email, enable 2-Step Verification.
2. Open Google's App Passwords page and create a password named `K-Connect`.
3. Copy the generated 16-character App Password into `GMAIL_APP_PASSWORD`. Spaces are okay; the backend removes them.
4. Set `GMAIL_USER` to the same Gmail address used to generate that App Password.
5. Save `backend/.env` and restart the backend.
6. Use **Forgot password?** with an account email, then check the inbox and spam folder for the six-digit code.

Never put the Gmail App Password in frontend files, send it in chat, or commit `backend/.env`. If the App Password is exposed, remove it from the Google Account and generate a new one. Google requires 2-Step Verification to create an App Password and may hide the option for some managed or protected accounts.

Google's current instructions: https://support.google.com/accounts/answer/185833
