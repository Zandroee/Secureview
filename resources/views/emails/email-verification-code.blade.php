<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your SecureView verification code</title>
</head>
<body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#172033;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fb;padding:32px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e9f2;border-radius:16px;overflow:hidden;">
                    <tr>
                        <td style="background:#10264a;padding:24px 30px;color:#ffffff;">
                            <div style="font-size:12px;letter-spacing:2px;font-weight:bold;color:#a9c8ff;">SECUREVIEW</div>
                            <div style="font-size:23px;font-weight:bold;margin-top:8px;">Verify your email address</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:30px;">
                            <p style="font-size:16px;line-height:1.6;margin:0 0 14px;">Hi {{ $name }},</p>
                            <p style="font-size:15px;line-height:1.7;margin:0 0 22px;color:#465166;">
                                Use the one-time code below to verify your email address and finish setting up your SecureView account.
                            </p>
                            <div style="background:#f4f7fc;border:1px solid #dce5f4;border-radius:12px;text-align:center;padding:22px 12px;margin:0 0 22px;">
                                <div style="font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#66738a;margin-bottom:10px;">Your verification code</div>
                                <div style="font-size:34px;line-height:1.2;font-weight:bold;letter-spacing:8px;color:#10264a;">{{ $code }}</div>
                            </div>
                            <p style="font-size:14px;line-height:1.7;color:#465166;margin:0 0 14px;">
                                This code expires in <strong>{{ $expiresInMinutes }} minutes</strong> and can only be used once. For your security, never share it with anyone.
                            </p>
                            <p style="font-size:14px;line-height:1.7;color:#66738a;margin:0;">
                                If you did not create a SecureView account, you can ignore this email.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:18px 30px;background:#f8faff;border-top:1px solid #e8edf5;color:#7b879a;font-size:12px;line-height:1.6;">
                            This is an automated email from SecureView. Please do not reply to this message.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
