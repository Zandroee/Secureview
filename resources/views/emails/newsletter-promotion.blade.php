<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $promotion['subject'] }} - Netmax Trading</title>
</head>
<body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#172033;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fb;padding:28px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e3e9f2;border-radius:14px;overflow:hidden;">
                    <tr>
                        <td style="background:#101b2d;padding:22px 28px;color:#ffffff;">
                            <div style="font-size:12px;letter-spacing:2px;font-weight:bold;color:#9ec5ff;">NETMAX TRADING</div>
                            <div style="font-size:24px;line-height:1.25;font-weight:bold;margin-top:8px;">{{ $promotion['headline'] }}</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px;">
                            <p style="font-size:15px;line-height:1.65;margin:0 0 14px;">Hi {{ $customerName ?: 'there' }},</p>
                            <p style="font-size:15px;line-height:1.7;color:#465166;margin:0 0 20px;">{{ $promotion['description'] }}</p>

                            @if(!empty($promotion['image_url']))
                                <p style="margin:0 0 20px;">
                                    <img src="{{ $promotion['image_url'] }}" alt="{{ $promotion['headline'] }}" width="544" style="display:block;width:100%;max-width:544px;height:auto;border:0;border-radius:10px;">
                                </p>
                            @endif

                            @if(!empty($promotion['code']))
                                <div style="border:1px dashed #9db9e8;background:#f4f8ff;border-radius:10px;padding:18px;text-align:center;margin:0 0 20px;">
                                    <div style="font-size:11px;letter-spacing:1.5px;color:#61718a;text-transform:uppercase;">Voucher code</div>
                                    <div style="font-size:25px;font-weight:bold;letter-spacing:2px;color:#0756c7;margin-top:6px;">{{ $promotion['code'] }}</div>
                                    <div style="font-size:13px;color:#61718a;margin-top:6px;">{{ $promotion['discount_label'] }}</div>
                                </div>
                            @elseif(!empty($promotion['discount_label']))
                                <div style="background:#f4f8ff;border-left:4px solid #087cff;border-radius:8px;padding:15px 17px;margin:0 0 20px;">
                                    <div style="font-size:20px;font-weight:bold;color:#0756c7;">{{ $promotion['discount_label'] }}</div>
                                    @if(!empty($promotion['price_label']))
                                        <div style="font-size:14px;color:#61718a;margin-top:5px;">{{ $promotion['price_label'] }}</div>
                                    @endif
                                </div>
                            @endif

                            @if(!empty($promotion['ends_at']))
                                <p style="font-size:13px;color:#65738a;margin:0 0 20px;">Offer ends {{ $promotion['ends_at'] }}. Availability and applicable voucher conditions apply.</p>
                            @endif

                            <p style="text-align:center;margin:0 0 22px;">
                                <a href="{{ $promotion['action_url'] }}" style="display:inline-block;background:#087cff;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 24px;border-radius:9px;">{{ $promotion['button_label'] ?? 'VIEW OFFER' }}</a>
                            </p>

                            <p style="font-size:12px;line-height:1.65;color:#7a8799;margin:0;">
                                You are receiving this promotional email because you opted in to Netmax Trading newsletters. This message is separate from service, order, payment, and account notifications.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:18px 28px;background:#f8faff;border-top:1px solid #e8edf5;color:#7b879a;font-size:12px;line-height:1.7;">
                            Netmax Trading · CCTV products, installation, and technical support<br>
                            <a href="{{ $unsubscribeUrl }}" style="color:#0756c7;">Unsubscribe from promotional emails</a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
