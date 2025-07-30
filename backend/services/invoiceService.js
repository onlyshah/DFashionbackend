const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

class InvoiceService {
    constructor() {
        this.setupEmailTransporter();
    }

    setupEmailTransporter() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    async generateInvoicePDF(orderData) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 50 });
                const filename = `invoice-${orderData.orderNumber}.pdf`;
                const filepath = path.join(__dirname, '../uploads/invoices', filename);

                // Ensure directory exists
                const dir = path.dirname(filepath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                const stream = fs.createWriteStream(filepath);
                doc.pipe(stream);

                // Header
                this.generateHeader(doc, orderData);
                
                // Customer Information
                this.generateCustomerInformation(doc, orderData);
                
                // Invoice Table
                this.generateInvoiceTable(doc, orderData);
                
                // Footer
                this.generateFooter(doc);

                doc.end();

                stream.on('finish', () => {
                    resolve({
                        filename,
                        filepath,
                        success: true
                    });
                });

                stream.on('error', (error) => {
                    reject(error);
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    generateHeader(doc, orderData) {
        doc
            .fillColor('#444444')
            .fontSize(20)
            .text('DFashion', 50, 45)
            .fontSize(10)
            .text('Fashion E-commerce Platform', 200, 50, { align: 'right' })
            .text('Email: support@dfashion.com', 200, 65, { align: 'right' })
            .text('Phone: +1 (555) 123-4567', 200, 80, { align: 'right' })
            .moveDown();

        // Invoice title
        doc
            .fillColor('#444444')
            .fontSize(20)
            .text('INVOICE', 50, 120);

        // Invoice details
        const invoiceY = 160;
        doc
            .fontSize(10)
            .text(`Invoice Number: ${orderData.orderNumber}`, 50, invoiceY)
            .text(`Invoice Date: ${new Date(orderData.createdAt).toLocaleDateString()}`, 50, invoiceY + 15)
            .text(`Due Date: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}`, 50, invoiceY + 30);
    }

    generateCustomerInformation(doc, orderData) {
        const customerY = 220;
        
        doc
            .fillColor('#444444')
            .fontSize(12)
            .text('Bill To:', 50, customerY)
            .fontSize(10)
            .text(orderData.customer.fullName, 50, customerY + 20)
            .text(orderData.customer.email, 50, customerY + 35);

        if (orderData.shippingAddress) {
            doc
                .text(orderData.shippingAddress.street, 50, customerY + 50)
                .text(`${orderData.shippingAddress.city}, ${orderData.shippingAddress.state} ${orderData.shippingAddress.zipCode}`, 50, customerY + 65)
                .text(orderData.shippingAddress.country, 50, customerY + 80);
        }

        // Order status
        doc
            .fontSize(12)
            .text('Order Status:', 300, customerY)
            .fontSize(10)
            .fillColor(this.getStatusColor(orderData.status))
            .text(orderData.status.toUpperCase(), 300, customerY + 20)
            .fillColor('#444444');
    }

    generateInvoiceTable(doc, orderData) {
        const tableTop = 330;
        const itemCodeX = 50;
        const descriptionX = 150;
        const quantityX = 350;
        const priceX = 400;
        const amountX = 480;

        // Table header
        doc
            .fillColor('#444444')
            .fontSize(10)
            .text('Item', itemCodeX, tableTop)
            .text('Description', descriptionX, tableTop)
            .text('Qty', quantityX, tableTop)
            .text('Price', priceX, tableTop)
            .text('Amount', amountX, tableTop);

        // Draw header line
        doc
            .strokeColor('#aaaaaa')
            .lineWidth(1)
            .moveTo(50, tableTop + 15)
            .lineTo(550, tableTop + 15)
            .stroke();

        // Table rows
        let position = tableTop + 30;
        let subtotal = 0;

        orderData.items.forEach((item, index) => {
            const itemTotal = item.quantity * item.price;
            subtotal += itemTotal;

            doc
                .fontSize(9)
                .text(item.productId.name || `Product ${index + 1}`, itemCodeX, position)
                .text(item.productId.description || 'Fashion Item', descriptionX, position, { width: 180 })
                .text(item.quantity.toString(), quantityX, position)
                .text(`$${item.price.toFixed(2)}`, priceX, position)
                .text(`$${itemTotal.toFixed(2)}`, amountX, position);

            position += 20;
        });

        // Summary
        const summaryTop = position + 20;
        
        doc
            .strokeColor('#aaaaaa')
            .lineWidth(1)
            .moveTo(350, summaryTop)
            .lineTo(550, summaryTop)
            .stroke();

        doc
            .fontSize(10)
            .text('Subtotal:', 400, summaryTop + 10)
            .text(`$${subtotal.toFixed(2)}`, amountX, summaryTop + 10);

        const tax = subtotal * 0.08; // 8% tax
        doc
            .text('Tax (8%):', 400, summaryTop + 25)
            .text(`$${tax.toFixed(2)}`, amountX, summaryTop + 25);

        const shipping = orderData.shippingCost || 0;
        doc
            .text('Shipping:', 400, summaryTop + 40)
            .text(`$${shipping.toFixed(2)}`, amountX, summaryTop + 40);

        const total = subtotal + tax + shipping;
        doc
            .fontSize(12)
            .fillColor('#000000')
            .text('Total:', 400, summaryTop + 60)
            .text(`$${total.toFixed(2)}`, amountX, summaryTop + 60);
    }

    generateFooter(doc) {
        doc
            .fontSize(8)
            .fillColor('#444444')
            .text('Thank you for your business!', 50, 700)
            .text('For questions about this invoice, contact support@dfashion.com', 50, 715)
            .text('Payment is due within 30 days. Late payments may incur additional charges.', 50, 730);
    }

    getStatusColor(status) {
        const colors = {
            'pending': '#ff9800',
            'confirmed': '#2196f3',
            'shipped': '#9c27b0',
            'delivered': '#4caf50',
            'cancelled': '#f44336'
        };
        return colors[status.toLowerCase()] || '#666666';
    }

    async sendInvoiceEmail(orderData, pdfPath) {
        try {
            const mailOptions = {
                from: process.env.SMTP_FROM || 'noreply@dfashion.com',
                to: orderData.customer.email,
                subject: `Invoice for Order #${orderData.orderNumber}`,
                html: this.generateEmailTemplate(orderData),
                attachments: [
                    {
                        filename: `invoice-${orderData.orderNumber}.pdf`,
                        path: pdfPath,
                        contentType: 'application/pdf'
                    }
                ]
            };

            const result = await this.transporter.sendMail(mailOptions);
            return {
                success: true,
                messageId: result.messageId,
                message: 'Invoice email sent successfully'
            };

        } catch (error) {
            console.error('Email sending error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    generateEmailTemplate(orderData) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Invoice - Order #${orderData.orderNumber}</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #667eea; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f9f9f9; }
                .order-details { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                .button { background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>DFashion</h1>
                    <h2>Invoice for Order #${orderData.orderNumber}</h2>
                </div>
                
                <div class="content">
                    <p>Dear ${orderData.customer.fullName},</p>
                    
                    <p>Thank you for your order! Please find your invoice attached to this email.</p>
                    
                    <div class="order-details">
                        <h3>Order Summary</h3>
                        <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
                        <p><strong>Order Date:</strong> ${new Date(orderData.createdAt).toLocaleDateString()}</p>
                        <p><strong>Status:</strong> ${orderData.status.toUpperCase()}</p>
                        <p><strong>Total Amount:</strong> $${orderData.totalAmount.toFixed(2)}</p>
                    </div>
                    
                    <p>Your order is being processed and you will receive tracking information once it ships.</p>
                    
                    <p>If you have any questions about your order, please don't hesitate to contact our customer support team.</p>
                    
                    <a href="mailto:support@dfashion.com" class="button">Contact Support</a>
                </div>
                
                <div class="footer">
                    <p>Thank you for shopping with DFashion!</p>
                    <p>© 2024 DFashion. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    async processOrderInvoice(orderData) {
        try {
            // Generate PDF
            const pdfResult = await this.generateInvoicePDF(orderData);
            
            if (!pdfResult.success) {
                throw new Error('Failed to generate PDF invoice');
            }

            // Send email with PDF attachment
            const emailResult = await this.sendInvoiceEmail(orderData, pdfResult.filepath);

            return {
                success: true,
                pdf: pdfResult,
                email: emailResult,
                message: 'Invoice generated and sent successfully'
            };

        } catch (error) {
            console.error('Invoice processing error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new InvoiceService();
