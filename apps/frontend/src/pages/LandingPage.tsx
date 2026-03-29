import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './LandingPage.css'

const marqueeItems = [
  'Record Sales Instantly',
  'Works Offline',
  'Track Debtors',
  'Manage Stock',
  'Export Reports',
  'PIN Security',
  'English & Pidgin',
  'WhatsApp Reports',
]

const features = [
  {
    key: 'a',
    icon: '??',
    iconClass: 'landing-icon-emerald',
    title: 'Live Dashboard',
    desc: "See today's sales, weekly profit, cash in hand, and who owes you the moment you open the app.",
    tag: 'Real-time',
  },
  {
    key: 'b',
    icon: '?',
    iconClass: 'landing-icon-gold',
    title: 'Record a Sale in 10 Seconds',
    desc: '4 taps. Item, amount, cash or credit. Done. Faster than writing in a book.',
  },
  {
    key: 'c',
    icon: '??',
    iconClass: 'landing-icon-purple',
    title: 'Works Without Internet',
    desc: 'Record everything offline. TradeBook syncs automatically when you reconnect.',
    tag: 'Offline-first',
  },
  {
    key: 'd',
    icon: '??',
    iconClass: 'landing-icon-gold',
    title: 'Debtor Tracker',
    desc: 'Know exactly who owes you, how much, and since when.',
  },
  {
    key: 'e',
    icon: '??',
    iconClass: 'landing-icon-emerald',
    title: 'Stock Alerts',
    desc: 'Get warned before you run out of your best-selling items.',
  },
  {
    key: 'f',
    icon: '??',
    iconClass: 'landing-icon-purple',
    title: 'WhatsApp Reports',
    desc: 'Share your daily summary directly to WhatsApp in one tap.',
  },
]

const steps = [
  ['Create your free account', 'Just your phone number and a 4-digit PIN. No email needed.'],
  ['Record your first sale', 'Tap Record Sale, enter amount, choose Cash or Credit. Done in 10 seconds.'],
  ['Check your dashboard daily', 'See your profit, who owes you, and what stock is running low every morning.'],
] as const

const testimonials = [
  {
    quote:
      "Before TradeBook I had three different notebooks and I still didn't know if I was making profit. Now I check my phone in the morning and I know everything.",
    initials: 'JC',
    avatar: 'linear-gradient(135deg,#0f6e56,#1db389)',
    name: 'J.C. Okafor',
    role: 'Cosmetics trader, Trade Fair Market',
  },
  {
    quote:
      'The debtor tracker alone is worth everything. I recovered N180,000 in one month just by knowing who to follow up with.',
    initials: 'AM',
    avatar: 'linear-gradient(135deg,#d4a843,#f0c96a)',
    name: 'Amaka M.',
    role: 'Fashion and fabrics, Alaba market',
  },
  {
    quote:
      "Even when power goes out and my data finishes, the app still works. That's what I needed: something that doesn't let me down.",
    initials: 'EK',
    avatar: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
    name: 'Emenike K.',
    role: 'Electronics, Computer Village',
  },
]

export const LandingPage = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cursorRef = useRef<HTMLDivElement | null>(null)
  const ringRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    document.body.classList.add('landing-shell')
    return () => document.body.classList.remove('landing-shell')
  }, [])

  useEffect(() => {
    const cursor = cursorRef.current
    const ring = ringRef.current
    if (!cursor || !ring || window.matchMedia('(pointer: coarse)').matches) return

    let mouseX = 0
    let mouseY = 0
    let ringX = 0
    let ringY = 0
    let frame = 0

    const onMove = (event: MouseEvent) => {
      mouseX = event.clientX
      mouseY = event.clientY
      cursor.style.left = `${mouseX}px`
      cursor.style.top = `${mouseY}px`
    }

    const animateRing = () => {
      ringX += (mouseX - ringX) * 0.12
      ringY += (mouseY - ringY) * 0.12
      ring.style.left = `${ringX}px`
      ring.style.top = `${ringY}px`
      frame = window.requestAnimationFrame(animateRing)
    }

    const targets = Array.from(document.querySelectorAll('.landing-shell a, .landing-shell button, .landing-card'))
    const expand = () => {
      cursor.style.transform = 'translate(-50%,-50%) scale(2)'
      ring.style.width = '56px'
      ring.style.height = '56px'
    }
    const collapse = () => {
      cursor.style.transform = 'translate(-50%,-50%) scale(1)'
      ring.style.width = '36px'
      ring.style.height = '36px'
    }

    document.addEventListener('mousemove', onMove)
    targets.forEach((target) => {
      target.addEventListener('mouseenter', expand)
      target.addEventListener('mouseleave', collapse)
    })

    animateRing()

    return () => {
      document.removeEventListener('mousemove', onMove)
      targets.forEach((target) => {
        target.removeEventListener('mouseenter', expand)
        target.removeEventListener('mouseleave', collapse)
      })
      window.cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    let frame = 0
    let t = 0

    const particles = Array.from({ length: 70 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 2 + 0.3,
      speedX: (Math.random() - 0.5) * 0.25,
      speedY: -Math.random() * 0.25 - 0.05,
      opacity: Math.random() * 0.35 + 0.05,
      color: Math.random() > 0.55 ? '212,168,67' : '29,179,137',
    }))

    const resize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    const draw = () => {
      t += 0.01
      ctx.clearRect(0, 0, width, height)

      const orbData = [
        { x: width * 0.15 + Math.sin(t) * 35, y: height * 0.3 + Math.cos(t) * 25, r: 120, color: 'rgba(212,168,67,0.04)' },
        { x: width * 0.85 + Math.sin(t * 0.7) * 30, y: height * 0.6 + Math.cos(t * 0.8) * 28, r: 180, color: 'rgba(15,110,86,0.05)' },
        { x: width * 0.5 + Math.sin(t * 0.6) * 24, y: height * 0.8 + Math.cos(t * 0.5) * 20, r: 160, color: 'rgba(212,168,67,0.03)' },
      ]

      orbData.forEach((orb) => {
        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r)
        gradient.addColorStop(0, orb.color)
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2)
        ctx.fill()
      })

      particles.forEach((particle) => {
        particle.x += particle.speedX
        particle.y += particle.speedY
        if (particle.x < -10) particle.x = width + 10
        if (particle.x > width + 10) particle.x = -10
        if (particle.y < -10) particle.y = height + 10
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${particle.color},${particle.opacity})`
        ctx.fill()
      })

      ctx.strokeStyle = 'rgba(255,255,255,0.018)'
      ctx.lineWidth = 0.5
      const size = 88
      for (let x = 0; x < width; x += size) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y < height; y += size) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      frame = window.requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      window.cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    const revealEls = Array.from(document.querySelectorAll<HTMLElement>('.landing-reveal'))
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (!entry.isIntersecting) return
          window.setTimeout(() => entry.target.classList.add('visible'), index * 60)
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )

    revealEls.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const counters = Array.from(document.querySelectorAll<HTMLElement>('[data-target]'))
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const el = entry.target as HTMLElement
          const target = Number(el.dataset.target)
          if (target === 0) {
            el.textContent = 'N0'
            observer.unobserve(el)
            return
          }
          let current = 0
          const step = target / 60
          const timer = window.setInterval(() => {
            current += step
            if (current >= target) {
              current = target
              window.clearInterval(timer)
            }
            const suffix = target === 98 ? '%' : target === 30 ? '+' : ''
            el.textContent = `${Math.floor(current).toLocaleString()}${suffix}`
          }, 16)
          observer.unobserve(el)
        })
      },
      { threshold: 0.5 }
    )

    counters.forEach((counter) => observer.observe(counter))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <div className="landing-cursor" ref={cursorRef} />
      <div className="landing-cursor-ring" ref={ringRef} />
      <canvas className="landing-scene" ref={canvasRef} />

      <nav className="landing-nav">
        <div className="landing-logo">Trade<span>Book</span></div>
        <ul>
          <li><a href="#features">Features</a></li>
          <li><a href="#how">How it works</a></li>
          <li><a href="#testimonials">Stories</a></li>
          <li><Link to="/register" className="landing-nav-cta">Get Started Free</Link></li>
        </ul>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-eyebrow">Built for Nigerian Market Traders</div>
        <h1 className="landing-hero-title">
          <span className="line1">Your Business.</span>
          <span className="line2">Your Records.</span>
          <span className="line3">In your pocket.</span>
        </h1>
        <p className="landing-hero-sub">
          Stop losing money to scattered notebooks. TradeBook gives you <strong>sales, stock, expenses, and debtors</strong> all in one place, even without internet.
        </p>
        <div className="landing-hero-actions">
          <Link to="/register" className="landing-btn-primary">Start for Free <span className="arrow">?</span></Link>
          <a href="#how" className="landing-btn-secondary">See how it works</a>
        </div>
        <div className="landing-hero-stats">
          <div className="landing-stat"><div className="landing-stat-num" data-target="2400">0</div><div className="landing-stat-label">Traders active</div></div>
          <div className="landing-stat-divider" />
          <div className="landing-stat"><div className="landing-stat-num" data-target="98">0</div><div className="landing-stat-label">% uptime</div></div>
          <div className="landing-stat-divider" />
          <div className="landing-stat"><div className="landing-stat-num" data-target="30">0</div><div className="landing-stat-label">Min saved daily</div></div>
          <div className="landing-stat-divider" />
          <div className="landing-stat"><div className="landing-stat-num" data-target="0">N0</div><div className="landing-stat-label">To get started</div></div>
        </div>
      </section>

      <div className="landing-marquee-wrap">
        <div className="landing-marquee-track">
          {[...marqueeItems, ...marqueeItems].map((item, index) => (
            <span key={`${item}-${index}`} className="landing-marquee-item"><span className="dot" />{item}</span>
          ))}
        </div>
      </div>

      <section className="landing-section" id="features">
        <div className="landing-section-label landing-reveal">Everything you need</div>
        <h2 className="landing-section-title landing-reveal">Built for how <em>you</em> actually trade</h2>
        <div className="landing-bento">
          {features.map((feature) => (
            <div key={feature.key} className={`landing-card landing-card-${feature.key} landing-reveal`}>
              <div className={`landing-card-icon ${feature.iconClass}`}>{feature.icon}</div>
              <div className="landing-card-title">{feature.title}</div>
              <div className="landing-card-desc">{feature.desc}</div>
              {feature.tag && <span className="landing-card-tag">{feature.tag}</span>}
              {feature.key === 'a' && (
                <div className="landing-visual">
                  <div className="landing-mini-dashboard">
                    <div className="landing-mini-row"><span className="landing-mini-label">Today's Sales</span><span className="landing-mini-val">N84,500</span></div>
                    <div className="landing-mini-bar-wrap"><div className="landing-mini-bar" style={{ width: '72%' }} /></div>
                    <div className="landing-mini-row landing-mini-row-spaced"><span className="landing-mini-label">Cash</span><span className="landing-mini-chip chip-green">+N12,000</span></div>
                    <div className="landing-mini-row"><span className="landing-mini-label">Transfer</span><span className="landing-mini-chip chip-gold">N45,000</span></div>
                    <div className="landing-mini-row"><span className="landing-mini-label">Debtors</span><span className="landing-mini-chip chip-red">N27,500</span></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="landing-divider" />

      <section className="landing-phone-section" id="how">
        <div className="landing-phone-text">
          <div className="landing-section-label landing-reveal">How it works</div>
          <h2 className="landing-section-title landing-reveal">From notebook to <em>smart records</em> in minutes</h2>
          <p className="landing-phone-copy landing-reveal">No training needed. If you can use WhatsApp, you can use TradeBook.</p>
          <div className="landing-phone-steps">
            {steps.map(([title, desc], index) => (
              <div key={title} className="landing-step landing-reveal">
                <div className="landing-step-num">{index + 1}</div>
                <div className="landing-step-content"><h4>{title}</h4><p>{desc}</p></div>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-phone-mockup landing-reveal">
          <div className="landing-phone-glow" />
          <div className="landing-floating-badge">N84,500 today</div>
          <div className="landing-phone-frame">
            <div className="landing-phone-screen">
              <div className="landing-phone-ui">
                <div className="landing-phone-header">
                  <div><div className="landing-phone-greeting">Good morning</div><div className="landing-phone-name">Amaka's Store</div></div>
                  <div className="landing-phone-avatar">A</div>
                </div>
                <div className="landing-phone-balance">
                  <div className="landing-phone-balance-label">Today's Sales</div>
                  <div className="landing-phone-balance-val">N84,500</div>
                  <div className="landing-phone-balance-sub">Up 12% vs yesterday</div>
                </div>
                <div className="landing-phone-actions">
                  <div className="landing-phone-action"><span className="landing-phone-action-icon">??</span>Sale</div>
                  <div className="landing-phone-action"><span className="landing-phone-action-icon">??</span>Stock</div>
                  <div className="landing-phone-action"><span className="landing-phone-action-icon">??</span>Debtors</div>
                  <div className="landing-phone-action"><span className="landing-phone-action-icon">??</span>Report</div>
                </div>
                <div className="landing-phone-txn">
                  <div className="landing-phone-txn-heading">Recent</div>
                  <div className="landing-phone-txn-row"><div><div className="landing-phone-txn-label">Tomato (5 bags)</div><div className="landing-phone-txn-sub">10:42 AM · Cash</div></div><div className="landing-phone-txn-amt pos">+N12,500</div></div>
                  <div className="landing-phone-txn-row"><div><div className="landing-phone-txn-label">Onion bulk</div><div className="landing-phone-txn-sub">9:15 AM · Transfer</div></div><div className="landing-phone-txn-amt pos">+N8,000</div></div>
                  <div className="landing-phone-txn-row"><div><div className="landing-phone-txn-label">Restock - Pepper</div><div className="landing-phone-txn-sub">8:30 AM · Expense</div></div><div className="landing-phone-txn-amt neg">-N4,500</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="landing-divider" />

      <section className="landing-testimonials" id="testimonials">
        <div className="landing-section-label landing-reveal">Real traders. Real results.</div>
        <h2 className="landing-section-title landing-reveal">What traders are <em>saying</em></h2>
        <div className="landing-testimonial-grid">
          {testimonials.map((testimonial) => (
            <div key={testimonial.name} className="landing-testimonial-card landing-reveal">
              <div className="landing-stars">? ? ? ? ?</div>
              <div className="landing-testimonial-quote">{testimonial.quote}</div>
              <div className="landing-testimonial-author">
                <div className="landing-testimonial-avatar" style={{ background: testimonial.avatar }}>{testimonial.initials}</div>
                <div><div className="landing-testimonial-name">{testimonial.name}</div><div className="landing-testimonial-role">{testimonial.role}</div></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-cta-section">
        <div className="landing-section-label landing-reveal">Free forever. No credit card.</div>
        <h2 className="landing-section-title landing-reveal">Ready to know your <em>numbers?</em></h2>
        <p className="landing-reveal landing-cta-copy">Join thousands of traders who finally have control of their business. Takes 2 minutes to set up.</p>
        <div className="landing-hero-actions landing-reveal">
          <Link to="/register" className="landing-btn-primary">Create Free Account <span className="arrow">?</span></Link>
          <Link to="/login" className="landing-btn-secondary">Open Login</Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-logo">Trade<span>Book</span></div>
        <p>© 2026 TradeBook. Built for Nigerian traders.</p>
        <div className="landing-footer-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <Link to="/login">Get Started</Link>
        </div>
      </footer>
    </>
  )
}


