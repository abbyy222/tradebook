import { Link } from 'react-router-dom'

const tools = [
  { title: 'Savings', desc: 'Track daily savings and totals', to: '/savings' },
  { title: 'Customers', desc: 'Customer list and contact directory', to: '/customers' },
  { title: 'Suppliers', desc: 'Supplier/vendor directory', to: '/suppliers' },
  { title: 'Team', desc: 'Manage owners and salespeople access', to: '/team' },
]

export const MorePage = () => {
  return (
    <div className="min-h-screen px-5 pb-8 pt-12 md:px-6 xl:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="label-base mb-1">Tools</p>
        <h1 className="font-display text-3xl font-bold text-primary wonky">More</h1>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {tools.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4 transition-opacity duration-150 hover:opacity-85"
            >
              <p className="font-ui text-base font-bold text-primary">{item.title}</p>
              <p className="mt-1 text-sm text-secondary">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
