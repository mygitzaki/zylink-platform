#!/bin/bash

echo "🚀 Setting up Zylink Platform for local development..."

# Create backend .env if it doesn't exist
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend/.env from template..."
    cp backend/env.example backend/.env
    
    # Update with local development settings
    sed -i.bak 's|DATABASE_URL="postgresql://.*"|DATABASE_URL="postgresql://postgres:password@localhost:5432/zylink_dev"|' backend/.env
    sed -i.bak 's|NODE_ENV=.*|NODE_ENV=development|' backend/.env
    sed -i.bak 's|PORT=4000|PORT=4001|' backend/.env
    sed -i.bak 's|CORS_ORIGIN=.*|CORS_ORIGIN=http://localhost:5173|' backend/.env
    sed -i.bak 's|JWT_SECRET=.*|JWT_SECRET=local-development-secret-key-12345|' backend/.env
    
    rm backend/.env.bak
    echo "✅ Backend .env created"
else
    echo "✅ Backend .env already exists"
fi

# Create frontend .env if it doesn't exist
if [ ! -f "frontend/.env.local" ]; then
    echo "📝 Creating frontend/.env.local..."
    cat > frontend/.env.local << EOF
VITE_API_URL=http://localhost:4001
NODE_ENV=development
EOF
    echo "✅ Frontend .env.local created"
else
    echo "✅ Frontend .env.local already exists"
fi

echo "🎉 Local environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure you have PostgreSQL running locally on port 5432"
echo "2. Create database: createdb zylink_dev"
echo "3. Run backend: cd backend && npm run dev"
echo "4. Run frontend: cd frontend && npm run dev"





