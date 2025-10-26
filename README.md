# Snarkels - Web3 Quiz Platform

A comprehensive Web3 quiz platform built with Next.js, Prisma, and Celo blockchain integration. Create interactive quizzes, earn rewards, and compete with the community.

## 🚀 Features

### Core Features
- **Interactive Quiz Creation**: Build engaging quizzes with multiple choice questions
- **Real-time Competition**: Speed-based scoring with bonus points for quick answers
- **Blockchain Rewards**: Earn CELO tokens and other crypto rewards
- **Multi-Network Support**: Celo, Ethereum, Polygon, Arbitrum, Base
- **Spam Control**: Entry fees to maintain quiz quality
- **Allowlist System**: Private quizzes with wallet-based access control

### Advanced Features
- **Quadratic Rewards**: Fair distribution based on performance and participation
- **Linear Rewards**: Fixed rewards for top N winners
- **Speed Bonus System**: Faster answers earn more points
- **Featured Quizzes**: Promote quality content on homepage
- **Socket Integration**: Real-time updates and reconnection support
- **Custom Tokens**: Support for any ERC-20 token across multiple networks

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Blockchain**: Celo, Ethereum, Polygon, Arbitrum, Base
- **Real-time**: Socket.IO
- **UI**: Lucide React Icons, Framer Motion

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd snarkels
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Update `.env.local` with your configuration:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/snarkels"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   
   # Or run migrations
   npm run db:migrate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Setup

### Prisma Schema
The application uses a comprehensive Prisma schema with the following models:

- **User**: Wallet-based user management
- **Quiz**: Quiz configuration and settings
- **Question**: Quiz questions with options
- **Submission**: User quiz submissions and scores
- **QuizReward**: Reward configuration and distribution
- **QuizAllowlist**: Private quiz access control
- **SocketSession**: Real-time connection management
- **FeaturedContent**: Homepage featured quizzes

### Database Commands
```bash
# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Run migrations
npm run db:migrate

# Open Prisma Studio
npm run db:studio
```

## 🎯 Usage

### Creating Quizzes
1. Navigate to `/create`
2. Fill in quiz details (title, description, time limit)
3. Configure spam control settings (optional)
4. Set up reward distribution (Linear or Quadratic)
5. Add questions with multiple choice options
6. Publish your quiz

### Joining Quizzes
1. Use a quiz code to join
2. Connect your wallet
3. Pay entry fee (if required)
4. Answer questions quickly for bonus points
5. View leaderboard and rewards

### Quiz Features

#### Spam Control
- Enable entry fees in various stablecoins
- Choose from multiple networks (Celo, Ethereum, Polygon, etc.)
- Set custom entry fee amounts
- Deter low-quality participants

#### Reward Systems
- **Linear**: Fixed rewards for top N winners
- **Quadratic**: Performance-based distribution
- Support for any ERC-20 token
- Multi-network reward distribution

#### Access Control
- Public quizzes (open to everyone)
- Private quizzes with allowlist
- 6-character unique quiz codes
- Wallet-based authentication

## 🔧 Configuration

### Supported Networks
- **Celo**: Native CELO, cUSD, cEUR, cREAL
- **Ethereum**: ETH, USDC, USDT
- **Polygon**: MATIC, USDC, USDT
- **Arbitrum**: ETH, USDC
- **Base**: ETH, USDC

### Token Configuration
Token configurations are managed in `lib/tokens-config.ts`:
- Entry fee tokens (stablecoins)
- Reward tokens (native and popular tokens)
- Custom token support
- Network-specific filtering

## 🚀 Deployment

### Vercel Deployment
1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Database Setup
1. Set up PostgreSQL database (e.g., Supabase, Railway, Neon)
2. Update `DATABASE_URL` in environment variables
3. Run database migrations

### Environment Variables
```env
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-secret-key"
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please open an issue on GitHub or contact the development team.

---

**Snarkels** - The future of interactive Web3 quizzes! 🎯✨
