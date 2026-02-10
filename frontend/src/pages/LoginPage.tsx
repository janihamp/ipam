import { useMsal } from '@azure/msal-react'
import { loginRequest } from '../config/authConfig'

export default function LoginPage() {
  const { instance } = useMsal()

  const handleLogin = () => {
    instance.loginRedirect(loginRequest)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-azure-500 to-azure-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-azure-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6M12 9v6" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Azure IPAM</h1>
          <p className="text-gray-600">IP Address Management Dashboard</p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">View All IP Addresses</h3>
              <p className="text-sm text-gray-500">Public and private IPs across your Azure tenant</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Monitor Subnet Usage</h3>
              <p className="text-sm text-gray-500">Visual utilization graphs for all subnets</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Detect CIDR Conflicts</h3>
              <p className="text-sm text-gray-500">Find overlapping address spaces instantly</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogin}
          className="w-full bg-azure-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-azure-600 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 21 21" fill="currentColor">
            <path d="M0 0h10v10H0z"/>
            <path d="M11 0h10v10H11z"/>
            <path d="M0 11h10v10H0z"/>
            <path d="M11 11h10v10H11z"/>
          </svg>
          Sign in with Microsoft
        </button>

        <p className="text-center text-xs text-gray-500 mt-4">
          Sign in with your Azure AD account to access the dashboard
        </p>
      </div>
    </div>
  )
}
