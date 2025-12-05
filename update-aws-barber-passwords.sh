#!/bin/bash

# Update Barber Passwords on AWS
# This script connects to AWS and updates all barber passwords to Barber123!

set -e

echo "🔐 Updating Barber Passwords on AWS..."
echo ""

# Load AWS config to get current IP
if [ -f "aws-config.env" ]; then
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ $key =~ ^#.*$ || -z $key ]] && continue
        # Skip SSH_COMMAND line
        [[ $key =~ ^SSH_COMMAND ]] && continue
        # Export the variable
        export "$key=$value"
    done < aws-config.env
    AWS_IP="$PUBLIC_IP"
    KEY_FILE="$SSH_KEY_FILE"
else
    echo "❌ Error: aws-config.env not found"
    exit 1
fi

# Check if SSH key exists
if [ ! -f "$KEY_FILE" ]; then
    echo "❌ Error: SSH key file not found: $KEY_FILE"
    echo "Please make sure barbershop-key.pem is in the current directory"
    exit 1
fi

echo "📡 Connecting to AWS server: $AWS_IP"
echo ""

# Run the password update script on AWS
ssh -i "$KEY_FILE" ubuntu@"$AWS_IP" << 'ENDSSH'
    set -e
    
    echo "📂 Navigating to application directory..."
    cd /home/ubuntu/barbershop
    
    echo "🔄 Updating barber passwords..."
    echo ""
    
    # Run password update directly via Node.js in the backend container
    docker exec barbershop_backend node -e "
        const bcrypt = require('bcryptjs');
        const pool = require('./src/config/database');
        
        (async () => {
            const client = await pool.connect();
            try {
                const newPassword = 'Barber123!';
                const hashedPassword = await bcrypt.hash(newPassword, 10);
                
                const result = await client.query(
                    'SELECT id, email, first_name, last_name FROM users WHERE role = \'barber\' ORDER BY email'
                );
                
                console.log('\\n📋 Found', result.rows.length, 'barber account(s):\\n');
                result.rows.forEach((b, i) => {
                    console.log('   ' + (i+1) + '.', b.first_name, b.last_name, '(' + b.email + ')');
                });
                
                await client.query('BEGIN');
                const updateResult = await client.query(
                    'UPDATE users SET password = \$1, updated_at = CURRENT_TIMESTAMP WHERE role = \'barber\'',
                    [hashedPassword]
                );
                await client.query('COMMIT');
                
                console.log('\\n✅ Successfully updated', updateResult.rowCount, 'password(s)\\n');
                console.log('🔐 New password for all barbers: Barber123!\\n');
                
                client.release();
                await pool.end();
                process.exit(0);
            } catch (error) {
                await client.query('ROLLBACK');
                console.error('❌ Error:', error.message);
                client.release();
                await pool.end();
                process.exit(1);
            }
        })();
    "
    
    echo ""
    echo "✅ Password update completed on AWS!"
ENDSSH

echo ""
echo "🎉 All barber passwords have been updated on AWS!"
echo ""
echo "📝 New Barber Credentials:"
echo "   - al@balkanbarbers.com / Barber123!"
echo "   - cynthia@balkanbarbers.com / Barber123!"
echo "   - eric@balkanbarbers.com / Barber123!"
echo "   - john@balkanbarbers.com / Barber123!"
echo "   - nick@balkanbarbers.com / Barber123!"
echo "   - riza@balkanbarbers.com / Barber123!"
echo ""
echo "🌌 Application URL: http://$AWS_IP"
echo ""
