import { NavLink } from 'react-router-dom'
import { APP_PRIMARY_NAV_ITEMS } from '@/components/AppNavigation'

export const BottomNav = () => {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#180d09]/95 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-xl items-stretch px-2">
        {APP_PRIMARY_NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/dashboard'} className="flex-1">
            {({ isActive }) => (
              <div
                className="relative flex min-h-[64px] flex-col items-center justify-center gap-1 py-2 transition-all duration-150"
                style={{ color: isActive ? '#f0bc5a' : 'rgba(245,237,224,0.45)' }}
              >
                {isActive && (
                  <span
                    className="absolute left-1/2 top-0 h-[3px] w-7 -translate-x-1/2 rounded-full"
                    style={{ background: 'linear-gradient(90deg, #c4622d, #e8a838)' }}
                  />
                )}
                <item.Icon active={isActive} className="h-5 w-5" />
                <span className="font-ui text-[10px] font-bold uppercase tracking-[0.1em]">
                  {item.label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
