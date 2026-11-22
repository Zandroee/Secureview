<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment reminder - Netmax Trading</title>
</head>
<body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#172033;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fb;padding:32px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e4e9f2;border-radius:16px;overflow:hidden;">
                    <tr>
                        <td style="background:#10264a;padding:24px 30px;color:#ffffff;">
                            <div style="font-size:12px;letter-spacing:2px;font-weight:bold;color:#a9c8ff;">NETMAX TRADING</div>
                            <div style="font-size:23px;font-weight:bold;margin-top:8px;">Your order is awaiting payment</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:30px;">
                            <p style="font-size:16px;line-height:1.6;margin:0 0 14px;">Hi {{ $customerName ?: 'there' }},</p>
                            <p style="font-size:15px;line-height:1.7;margin:0 0 22px;color:#465166;">
                                This is a friendly reminder that payment for your Netmax Trading order is still pending. Please review your order and complete payment before the deadline below.
                            </p>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #dce5f4;border-radius:12px;margin:0 0 22px;">
                                <tr>
                                    <td style="padding:14px 16px;border-bottom:1px solid #e8edf5;color:#66738a;font-size:13px;">Order number</td>
                                    <td align="right" style="padding:14px 16px;border-bottom:1px solid #e8edf5;color:#172033;font-size:14px;font-weight:bold;">{{ $orderNumber }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:14px 16px;border-bottom:1px solid #e8edf5;color:#66738a;font-size:13px;">Amount due</td>
                                    <td align="right" style="padding:14px 16px;border-bottom:1px solid #e8edf5;color:#0756c7;font-size:18px;font-weight:bold;">₱{{ number_format($orderTotal, 2) }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:14px 16px;color:#66738a;font-size:13px;">Payment method</td>
                                    <td align="right" style="padding:14px 16px;color:#172033;font-size:14px;font-weight:bold;">{{ $paymentMethod }}</td>
                                </tr>
                            </table>

                            <div style="background:#fff8e8;border:1px solid #f1d69c;border-radius:12px;padding:16px;margin:0 0 22px;">
                                <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#8a641c;margin-bottom:6px;">Please pay by</div>
                                <div style="font-size:16px;font-weight:bold;color:#6f4d0b;">{{ $paymentDeadline->timezone(config('app.timezone'))->format('F j, Y · g:i A') }}</div>
                                <div style="font-size:13px;line-height:1.6;color:#765c2d;margin-top:6px;">Orders that remain unpaid may be automatically cancelled after the payment period ends.</div>
                            </div>

                            <p style="text-align:center;margin:0 0 22px;">
                                <a href="{{ $paymentUrl }}" style="display:inline-block;background:#087cff;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 24px;border-radius:9px;">VIEW ORDER &amp; COMPLETE PAYMENT</a>
                            </p>

                            <p style="font-size:13px;line-height:1.7;color:#66738a;margin:0;">
                                Already paid? You can disregard this reminder. Payment status will update once your payment is confirmed. For assistance, visit our website and use the Chat with us support option.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:18px 30px;background:#f8faff;border-top:1px solid #e8edf5;color:#7b879a;font-size:12px;line-height:1.6;">
                            This is an automated payment reminder from Netmax Trading. Please do not reply to this message.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
