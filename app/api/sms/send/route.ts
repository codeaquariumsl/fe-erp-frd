import { NextRequest, NextResponse } from 'next/server'

interface SMSRequest {
  to: string
  orderNumber: string
  customerName: string
  deliveryDate: string
  totalAmount: number
  itemCount: number
}

// Twilio configuration
const TWILIO_CONFIG = {
  accountSid: process.env.TWILIO_ACCOUNT_SID || '',
  authToken: process.env.TWILIO_AUTH_TOKEN || '', // Set in environment variables
  messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID || ''
}

function generateSalesOrderSMS(orderData: {
  orderNumber: string
  customerName: string
  deliveryDate: string
  totalAmount: number
  itemCount: number
}): string {
  return `Hello ${orderData.customerName}! 👋

Your sales order has been confirmed:
📋 Order: ${orderData.orderNumber}
📅 Delivery: ${orderData.deliveryDate}
📦 Items: ${orderData.itemCount} item(s)
💰 Total: LKR ${orderData.totalAmount.toLocaleString()}

Thank you for your business!
- Code Aqua ERP Solutions`
}

async function sendTwilioSMS(to: string, body: string): Promise<boolean> {
  try {
    // Format phone number to international format if needed
    let phoneNumber = to
    if (phoneNumber.startsWith('0')) {
      phoneNumber = '+94' + phoneNumber.substring(1)
    } else if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+94' + phoneNumber
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_CONFIG.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${TWILIO_CONFIG.accountSid}:${TWILIO_CONFIG.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phoneNumber,
          MessagingServiceSid: TWILIO_CONFIG.messagingServiceSid,
          Body: body,
        }),
      }
    )

    if (response.ok) {
      const result = await response.json()
      console.log('SMS sent successfully:', result.sid)
      return true
    } else {
      const error = await response.text()
      console.error('Failed to send SMS:', error)
      return false
    }
  } catch (error) {
    console.error('SMS sending error:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: SMSRequest = await request.json()

    // Validate required fields
    if (!data.to || !data.orderNumber || !data.customerName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if Twilio auth token is configured
    if (!TWILIO_CONFIG.authToken) {
      console.error('TWILIO_AUTH_TOKEN environment variable not set')
      return NextResponse.json(
        { error: 'SMS service not configured' },
        { status: 500 }
      )
    }

    // Generate SMS message
    const smsBody = generateSalesOrderSMS({
      orderNumber: data.orderNumber,
      customerName: data.customerName,
      deliveryDate: data.deliveryDate,
      totalAmount: data.totalAmount,
      itemCount: data.itemCount
    })

    // Send SMS
    const success = await sendTwilioSMS(data.to, smsBody)

    if (success) {
      return NextResponse.json({ success: true, message: 'SMS sent successfully' })
    } else {
      return NextResponse.json(
        { error: 'Failed to send SMS' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('SMS API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
