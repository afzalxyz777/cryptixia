import DeFiAgent from '../components/DeFiAgent';

export default function DeFiDemo() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white py-16">
                <div className="max-w-4xl mx-auto text-center px-4">
                    <h1 className="text-4xl font-bold mb-4">DeFi Agent Demo</h1>
                    <p className="text-xl text-green-100">
                        Experience autonomous DeFi portfolio management
                    </p>
                </div>
            </div>

            <div className="py-8">
                <DeFiAgent />
            </div>
        </div>
    );
}