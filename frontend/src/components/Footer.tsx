import { Github, Linkedin, Info, MessageSquare } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()
  
  const openFeedback = () => {
    window.open('https://github.com/benarch/Azure-IPAM/issues/new?template=feature_request.md', '_blank')
  }

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 px-6 mt-auto">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          © {currentYear} Azure IPAM. All rights reserved.
        </p>
        
        <div className="flex items-center gap-6">
          <a
            href="https://github.com/benarch/Azure-IPAM"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-azure-600 dark:hover:text-azure-400 transition-colors"
          >
            <Github className="w-4 h-4" />
            Product
          </a>
          <a
            href="https://linkedin.com/in/bendali"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-azure-600 dark:hover:text-azure-400 transition-colors"
          >
            <Linkedin className="w-4 h-4" />
            Publisher
          </a>
          <button
            onClick={(e) => {
              e.preventDefault()
              window.dispatchEvent(new CustomEvent('open-about'))
            }}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-azure-600 dark:hover:text-azure-400 transition-colors"
          >
            <Info className="w-4 h-4" />
            About
          </button>
          <button
            onClick={openFeedback}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-azure-600 dark:hover:text-azure-400 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Feedback
          </button>
        </div>
      </div>
    </footer>
  )
}
