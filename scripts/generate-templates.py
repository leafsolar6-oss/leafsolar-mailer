#!/usr/bin/env python3
"""Generates src/lib/template-library.ts — a large, professional email template
library reflecting the real content of www.leafsolar.ng (Ibadan solar installer
+ home appliance & electronics store)."""
import json, os

OUT = os.path.join(os.path.dirname(__file__), "..", "src", "lib", "template-library.ts")

BRAND = {
    "name": "Leaf Solar",
    "site": "https://www.leafsolar.ng",
    "phone": "+234 (0) 803 000 0000",
    "city": "Ibadan, Nigeria",
    "rc": "RC7896501",
}

# ---------- HTML building blocks (email-safe, inline styles, div/table hybrid) ----------

def shell(inner: str, preheader: str = "") -> str:
    return f"""<div style="margin:0;padding:0;background-color:#f4f6f5;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">{preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6f5;padding:16px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(20,40,30,.08);">
        <tr><td style="background:#ffffff;padding:20px 32px;border-bottom:1px solid #eef2f0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-size:0;">
                <span style="display:inline-block;width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#fbbf24,#f59e0b 55%,#10b981);vertical-align:middle;margin-right:10px;">&nbsp;</span>
                <span style="font-size:19px;font-weight:800;color:#0f3d2e;letter-spacing:-.02em;vertical-align:middle;">Leaf<span style="color:#16a34a;">Solar</span></span>
              </td>
              <td align="right" style="font-size:11px;color:#7a8a82;vertical-align:middle;">Ibadan, Nigeria<br><span style="color:#16a34a;font-weight:700;">Solar · Electronics · Appliances</span></td>
            </tr>
          </table>
        </td></tr>
        {inner}
        <tr><td style="background:#0f3d2e;padding:26px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-size:13px;color:#cde7d9;line-height:1.7;">
                <strong style="color:#ffffff;font-size:14px;">{BRAND['name']}</strong><br>
                {BRAND['city']} · RC {BRAND['rc']}<br>
                Fouani Authorized Dealer · Secure Paystack checkout
              </td>
              <td align="right" style="font-size:12px;color:#cde7d9;line-height:2;">
                <a href="{BRAND['site']}" style="color:#fbbf24;text-decoration:none;display:block;">www.leafsolar.ng</a>
                <a href="https://wa.me/2348000000000" style="color:#fbbf24;text-decoration:none;">WhatsApp us</a>
              </td>
            </tr>
          </table>
          <p style="font-size:11px;color:#8fae9e;margin:18px 0 0;padding-top:14px;border-top:1px solid rgba(255,255,255,.12);text-align:center;">
            You received this email because you asked us about solar power or home appliances.<br>
            <a href="{{{{unsubscribe}}}}" style="color:#8fae9e;">Unsubscribe</a> · <a href="{BRAND['site']}" style="color:#8fae9e;">Manage preferences</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>"""

def hero(title: str, sub: str = "", cta: str | None = None, cta_url: str = BRAND['site'],
         style: str = "emerald") -> str:
    bg = {
        "emerald": "linear-gradient(135deg,#10b981 0%,#047857 100%)",
        "amber": "linear-gradient(135deg,#f59e0b 0%,#d97706 100%)",
        "dark": "linear-gradient(135deg,#0f3d2e 0%,#064e3b 100%)",
        "red": "linear-gradient(135deg,#ef4444 0%,#b91c1c 100%)",
        "blue": "linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%)",
        "violet": "linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%)",
    }[style]
    cta_color = "#ffffff" if style in ("emerald", "dark", "red", "blue", "violet") else "#0f3d2e"
    cta_bg = "#ffffff" if style in ("emerald", "dark", "red", "blue", "violet") else "#0f3d2e"
    btn = f'<br><a href="{cta_url}" style="display:inline-block;background:{cta_bg};color:{cta_color};padding:13px 30px;border-radius:10px;font-weight:800;font-size:14px;text-decoration:none;margin-top:18px;">{cta}</a>' if cta else ""
    return f"""<tr><td style="background:{bg};padding:38px 32px;text-align:center;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.75);">Leaf Solar · {BRAND['city']}</p>
      <h1 style="margin:0;color:#ffffff;font-size:26px;line-height:1.25;letter-spacing:-.02em;">{title}</h1>
      {f'<p style="margin:10px 0 0;color:rgba(255,255,255,.85);font-size:15px;line-height:1.6;">{sub}</p>' if sub else ''}
      {btn}
    </td></tr>"""

def section(title: str, sub: str = "", bg: str = "#ffffff") -> str:
    return f"""<tr><td style="background:{bg};padding:28px 32px 8px;">
      <h2 style="margin:0;font-size:18px;color:#0f3d2e;letter-spacing:-.01em;">{title}</h2>
      {f'<p style="margin:6px 0 0;font-size:14px;color:#5b6f66;line-height:1.6;">{sub}</p>' if sub else ''}
    </td></tr>"""

def cta_block(text: str, url: str = BRAND['site'], sub: str = "", style: str = "emerald") -> str:
    if style == "amber":
        bg, fg = "#f59e0b", "#0f3d2e"
    else:
        bg, fg = "#10b981", "#ffffff"
    return f"""<tr><td style="padding:22px 32px;text-align:center;background:#fbfdfc;">
      {f'<p style="margin:0 0 12px;font-size:14px;color:#5b6f66;">{sub}</p>' if sub else ''}
      <a href="{url}" style="display:inline-block;background:{bg};color:{fg};padding:14px 36px;border-radius:12px;font-weight:800;font-size:15px;text-decoration:none;">{text}</a>
    </td></tr>"""

def feature_list(items: list[str], title: str = "Why Leaf Solar?") -> str:
    lis = "".join(
        f'<tr><td style="padding:7px 0;font-size:14px;color:#33473e;line-height:1.55;"><span style="color:#10b981;font-weight:800;margin-right:8px;">✓</span>{it}</td></tr>'
        for it in items)
    return f"""<tr><td style="padding:16px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f9f6;border-radius:14px;padding:16px 20px;">
        <tr><td style="padding:10px 4px 2px;font-size:13px;font-weight:800;color:#0f3d2e;letter-spacing:.08em;text-transform:uppercase;">{title}</td></tr>
        {lis}
      </table>
    </td></tr>"""

def product_cards(items: list[tuple[str, str, str]], cols: int = 2) -> str:
    """items: (name, price, url)"""
    cards = ""
    for name, price, url in items:
        cards += f"""
        <td width="{50 if cols==2 else 100}%" style="padding:8px;vertical-align:top;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e6ece9;border-radius:14px;overflow:hidden;">
            <tr><td style="background:#f6faf8;height:8px;font-size:0;">&nbsp;</td></tr>
            <tr><td style="padding:14px 16px;">
              <p style="margin:0 0 6px;font-size:14px;font-weight:800;color:#0f3d2e;line-height:1.4;">{name}</p>
              <p style="margin:0 0 10px;font-size:15px;color:#16a34a;font-weight:800;">{price}</p>
              <a href="{url}" style="display:inline-block;background:#10b981;color:#fff;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;">View &amp; buy</a>
            </td></tr>
          </table>
        </td>"""
        if cols == 2 and (len(items) % 2 == 0):
            cards += "</tr><tr>"
    return f"""<tr><td style="padding:8px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>{cards}</tr></table>
    </td></tr>"""

def pricing_table(rows: list[tuple[str, str, str]], highlight_idx: int = 1) -> str:
    trs = ""
    for i, (name, price, url) in enumerate(rows):
        hl = "background:#0f3d2e;color:#ffffff;" if i == highlight_idx else ""
        hl2 = "color:#ffffff;" if i == highlight_idx else "color:#0f3d2e;"
        hl3 = "background:#10b981;" if i == highlight_idx else "background:#f0f5f2;"
        trs += f"""<tr>
          <td style="padding:14px 16px;border-bottom:1px solid #eef2f0;{hl}{hl2}font-size:14px;font-weight:700;">{name}</td>
          <td style="padding:14px 16px;border-bottom:1px solid #eef2f0;{hl}{hl2}font-size:15px;font-weight:800;">{price}</td>
          <td align="right" style="padding:10px 16px;border-bottom:1px solid #eef2f0;{hl}"><a href="{url}" style="display:inline-block;background:{hl3};color:{'#ffffff' if i==highlight_idx else '#0f3d2e'};padding:8px 14px;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;">Explore</a></td>
        </tr>"""
    return f"""<tr><td style="padding:14px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e6ece9;border-radius:14px;overflow:hidden;">
        {trs}
      </table>
    </td></tr>"""

def testimonial(quote: str, name: str, where: str) -> str:
    return f"""<tr><td style="padding:20px 40px;text-align:center;">
      <p style="font-size:40px;color:#f59e0b;margin:0;line-height:1;">“</p>
      <p style="font-size:15px;color:#33473e;font-style:italic;line-height:1.7;margin:0 0 12px;">{quote}</p>
      <p style="font-size:13px;font-weight:800;color:#0f3d2e;margin:0;">— {name}</p>
      <p style="font-size:12px;color:#7a8a82;margin:2px 0 0;">{where}</p>
    </td></tr>"""

def trust_bar() -> str:
    badges = ["Fouani Authorized Dealer", "RC7896501", "Secure Paystack checkout",
              "Free delivery in Ibadan", "Real local support"]
    spans = "".join(
        f'<span style="display:inline-block;margin:4px 6px;padding:6px 12px;background:#f0f5f2;border-radius:999px;font-size:11px;font-weight:700;color:#0f3d2e;">{b}</span>'
        for b in badges)
    return f"""<tr><td style="padding:18px 32px;text-align:center;background:#fbfdfc;border-top:1px dashed #dde8e2;border-bottom:1px dashed #dde8e2;">{spans}</td></tr>"""

def paragraph(text: str, align: str = "left") -> str:
    return f"""<tr><td style="padding:10px 32px;font-size:14px;color:#33473e;line-height:1.75;">{text}</td></tr>"""

def spacer(px: int = 12) -> str:
    return f"""<tr><td style="height:{px}px;font-size:0;line-height:0;">&nbsp;</td></tr>"""

def two_col(left_title: str, left_text: str, right_title: str, right_text: str, url: str) -> str:
    return f"""<tr><td style="padding:12px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="50%" style="padding:8px;background:#f4f9f6;border-radius:14px;vertical-align:top;">
            <p style="margin:0 0 6px;font-size:14px;font-weight:800;color:#0f3d2e;">{left_title}</p>
            <p style="margin:0;font-size:13px;color:#5b6f66;line-height:1.6;">{left_text}</p>
          </td>
          <td width="50%" style="padding:8px;background:#fff7e8;border-radius:14px;vertical-align:top;">
            <p style="margin:0 0 6px;font-size:14px;font-weight:800;color:#0f3d2e;">{right_title}</p>
            <p style="margin:0;font-size:13px;color:#7a5b1f;line-height:1.6;">{right_text}</p>
          </td>
        </tr>
      </table>
      <p style="text-align:center;margin:10px 0 0;"><a href="{url}" style="font-size:13px;font-weight:800;color:#16a34a;">Learn more →</a></p>
    </td></tr>"""

def plain(title: str, sub: str, cta: str | None = None, style: str = "emerald") -> str:
    return hero(title, sub, cta, style=style)

# ---------- Template recipes ----------

def recipe_product_spotlight(cat: str, items, headline, sub, cta_label="Browse all products", cta_url=BRAND['site']+"/products") -> str:
    return shell(
        hero(headline, sub, cta_label, cta_url) +
        section(f"Featured {cat}", "Hand-picked for you — verified listings with warranty info.") +
        product_cards(items) +
        trust_bar() +
        feature_list(["Free delivery in Ibadan — owner-approved quotes elsewhere", "Secure Paystack checkout with verified confirmation", "Warranty info confirmed before you buy", "Call or WhatsApp our real local team"]) +
        paragraph(f"See the full {cat.lower()} range and 90+ more products on our store — updated regularly. "
                  f"<a href='{BRAND['site']}' style='color:#16a34a;font-weight:700;'>Visit www.leafsolar.ng →</a>") +
        spacer()
    )

def recipe_offer(title, sub, items=None, rows=None, cta="Shop the offer", cta_url=BRAND['site']+"/products?sort=sale", hero_style="red") -> str:
    inner = hero(title, sub, cta, cta_url, style=hero_style)
    if rows:
        inner += section("Package starting points", "Final design confirmed by our team before anything is built.")
        inner += pricing_table(rows)
    elif items:
        inner += section("Included in this offer", "Limited quantities — while stock lasts.")
        inner += product_cards(items)
    inner += trust_bar()
    inner += cta_block("Shop now", cta_url, sub="Sale prices already applied at checkout")
    return shell(inner, preheader=title)

def recipe_newsletter(headline, lead, body_html, items=None, tip=None) -> str:
    inner = hero(headline, lead, style="dark")
    inner += paragraph(body_html)
    if items:
        inner += section("New this week")
        inner += product_cards(items)
    if tip:
        inner += feature_list([tip], title="Pro tip this month")
    inner += cta_block("Browse the store", BRAND['site']+"/products", sub="90+ products across 8 categories")
    return shell(inner)

def recipe_followup(headline, sub, body_html, cta, cta_url=BRAND['site'], extra=None) -> str:
    inner = hero(headline, sub, cta, cta_url, style="emerald")
    inner += paragraph(body_html)
    if extra:
        inner += extra
    inner += feature_list(["We reply within one business day", "Call or WhatsApp for the fastest response", "Owner-approved quotes — no pressure, no spam"])
    return shell(inner)

# ---------- Build the library ----------

T = []
def add(name, subject, category, body):
    T.append({"name": name, "subject": subject, "category": category, "body": body})

SITE = BRAND['site']
SHOP = SITE + "/products"
SOLAR = SITE + "/solar-products"
CALC = SITE + "/solar-calculator"
PKG = SITE + "/packages"
PKG_TUB = PKG + "?series=tubular"
PKG_LIT = PKG + "?series=lithium"
PKG_COM = PKG + "?series=commercial"
PKG_IND = PKG + "?series=industrial"

# ============ 1. PROMOTIONS & OFFERS ============
add("Flash Sale — Up to 3% Off Today", "⚡ Flash Sale: Up to 3% off select appliances today",
    "promotion",
    recipe_offer("Flash Sale Ends Tonight", "Up to 3% off selected TVs, fridges, ACs and more. While stock lasts.",
        items=[("Hisense SPLIT 1HP COPPER AC", "₦270,650 <s>₦279,000</s>", SHOP+"/hisense-split-1hp-copper"),
               ("Hisense TV 32A4s FHD SMART", "₦190,150 <s>₦196,000</s>", SHOP),
               ("Hisense Refrigerator 093DR 90L", "₦178,500 <s>₦184,000</s>", SHOP)]))

add("Weekend Deal — Home Comfort Bundle", "Weekend deal: save on ACs, fans & fridges", "promotion",
    recipe_offer("Weekend Comfort Sale", "Beat the heat this weekend. Inverter ACs, tower fans and fridges at sale prices.",
        items=[("LG SPLIT 1.5HP INVERTER AC", "₦444,300 <s>₦458,000</s>", SHOP),
               ("Maxi TOWER Fan 28in Black", "₦33,500 <s>₦34,500</s>", SHOP)]))

add("Harmattan Sale — Dry Season Essentials", "Harmattan Sale: dry-season essentials at great prices", "promotion",
    recipe_offer("Harmattan Sale", "Kettles, washers, generators and solar — everything you need for a comfortable dry season.",
        items=[("Maxi Kettle 1.7L 1500W", "₦19,350 <s>₦19,900</s>", SHOP),
               ("Hisense Washing Machine", "From ₦289,000", SHOP)]))

add("Rainy Season Ready — Power That Never Sleeps", "Rainy season: keep power on with solar + generators", "promotion",
    recipe_offer("Rainy Season Power Sale", "Elections don't take breaks — neither should your power. Solar bundles + generator deals.",
        rows=[("Tubular package (home backup)", "from ₦1,100,000", PKG_TUB),
              ("Lithium package (long-life)", "from ₦3,800,000", PKG_LIT),
              ("Commercial package", "from ₦14,800,000", PKG_COM)]))

add("Black Friday Early Access", "Early access: Black Friday prices on TVs & solar", "promotion",
    recipe_offer("Black Friday Early Access", "Our biggest prices of the year, for subscribers first. TVs, audio, appliances and solar.",
        items=[("Hisense Audio HS2.1 240W", "₦139,700 <s>₦144,000</s>", SHOP),
               ("LG 1.5HP Inverter AC", "₦444,300 <s>₦458,000</s>", SHOP)]))

add("New Year, New Power — January Solar Deal", "January: switch to solar & pay less from month one", "promotion",
    recipe_offer("New Year Power Sale", "Start the year with lower bills. Solar packages with flexible planning.",
        rows=[("Tubular packages", "from ₦1,100,000", PKG_TUB),
              ("Lithium packages", "from ₦3,800,000", PKG_LIT),
              ("Industrial packages", "from ₦24,800,000", PKG_IND)], hero_style="amber"))

add("Independence Day Sale — 1st October", "🇳🇬 Independence Day Sale on appliances", "promotion",
    recipe_offer("Independence Day Sale", "Celebrate with savings — select TVs, fridges and kitchen appliances on promo this week.",
        items=[("Hisense Refrigerator 90L", "₦178,500 <s>₦184,000</s>", SHOP),
               ("Hisense 32in Smart TV", "₦190,150 <s>₦196,000</s>", SHOP)]))

add("Refer a Friend — N5,000 Off Each", "Refer a friend: you both save ₦5,000", "promotion",
    recipe_offer("Refer & Save ₦5,000", "Recommend Leaf Solar to a neighbour or colleague. When they buy, you both get ₦5,000 off your next purchase.",
        cta="Send a referral", hero_style="violet"))

add("Bundle & Save — Solar + Appliance Combo", "Bundle & save: solar installation + new appliances", "promotion",
    recipe_offer("Bundle & Save", "Plan a solar installation and add appliances in one order. Bundled pricing + delivery in Ibadan.",
        cta="Plan my bundle", cta_url=SOLAR))

add("Price Drop Alert — Hisense ACs", "Price drop: Hisense split ACs now from ₦270,650", "promotion",
    recipe_offer("Price Drop on Hisense ACs", "Hisense SPLIT 1HP COPPER AC — now ₦270,650 (was ₦279,000). Copper coils, quiet operation.",
        items=[("Hisense SPLIT 1HP COPPER", "₦270,650 <s>₦279,000</s>", SHOP)]))

add("Clearance — Last Units at 3% Off", "Clearance: last units, 3% off, first come first served", "promotion",
    recipe_offer("Clearance Event", "Final units of select models at 3% off. Once they're gone, they're gone.",
        cta="See clearance items"))

add("Anniversary Sale — Thank You Ibadan", "1 year of Leaf Solar — anniversary sale week", "promotion",
    recipe_offer("Anniversary Sale", "One year serving Ibadan with solar power and appliances. Celebrate with us — special prices all week.",
        cta="Shop the celebration", hero_style="amber"))

# ============ 2. PRODUCT SPOTLIGHTS (8 categories × ~2-3) ============
add("Smart TVs — Big Screens, Current Listings", "New TVs in stock — from 32\" smart to cinema-size", "product",
    recipe_product_spotlight("Televisions",
        [("Hisense TV 32A4s FHD SMART", "₦190,150", SHOP), ("Hisense 43\" Smart TV", "From ₦320,000", SHOP)],
        "Upgrade Your Home Entertainment",
        "Smart TVs from Hisense and LG — crisp FHD & 4K, ready for Netflix and DStv."))

add("TV Buying Guide — Which Screen Fits?", "Buying a TV? Sizes, resolution & smart features explained", "product",
    recipe_product_spotlight("Televisions",
        [("32\" FHD Smart — bedrooms & kitchens", "₦190,150", SHOP), ("43\"+ 4K — living room", "From ₦350,000", SHOP)],
        "Finding the Perfect TV",
        "Three quick questions: room size, viewing distance, and what you watch. We'll match you."))

add("Fridges & Freezers — Fresh for Longer", "New fridges & freezers — from 90L to family-size", "product",
    recipe_product_spotlight("Fridges & Freezers",
        [("Hisense Refrigerator 90L Silver", "₦178,500", SHOP), ("Family-size freezer", "From ₦420,000", SHOP)],
        "Keep Everything Fresh",
        "Quiet compressors, energy-smart cooling and sizes for every home."))

add("Inverter Air Conditioners — Cool Without the Bill Shock", "Inverter ACs: cool comfort, lower running costs", "product",
    recipe_product_spotlight("Air Conditioners",
        [("Hisense SPLIT 1HP COPPER", "₦270,650", SHOP), ("LG SPLIT 1.5HP INVERTER", "₦444,300", SHOP)],
        "Beat the Heat, Save Power",
        "Inverter technology cuts running costs. Copper-coil splits from Hisense and LG."))

add("Washers & Dryers — Laundry Day, Solved", "Washing machines & dryers in stock now", "product",
    recipe_product_spotlight("Washers & Dryers",
        [("Front-load washer", "From ₦310,000", SHOP), ("Twin-tub value pick", "From ₦165,000", SHOP)],
        "Laundry Made Easy",
        "From compact twin-tubs to large-capacity front-loaders."))

add("Kitchen & Cooking — Everything Your Kitchen Needs", "Kettles, cookers, air fryers & more", "product",
    recipe_product_spotlight("Kitchen & Cooking",
        [("Maxi Kettle 1.7L 1500W", "₦19,350", SHOP), ("Air fryer", "From ₦85,000", SHOP)],
        "A Kitchen That Works for You",
        "Air fryers, kettles, cookers and small appliances for everyday cooking."))

add("Fans & Coolers — Comfort on a Breeze", "Tower fans & coolers for the hot months", "product",
    recipe_product_spotlight("Fans & Coolers",
        [("Maxi TOWER Fan 28in Black", "₦33,500", SHOP), ("Stand fans", "From ₦24,000", SHOP)],
        "Stay Cool, Stay Comfortable",
        "Powerful air movement with low power draw — perfect for Harmattan nights."))

add("Generators & Power — Never Be in the Dark", "Generators for every home size", "product",
    recipe_product_spotlight("Generators & Power",
        [("2.5kVA petrol", "From ₦210,000", SHOP), ("5kVA+ heavy duty", "From ₦540,000", SHOP)],
        "Power When You Need It",
        "Reliable petrol & inverter generators, serviced locally in Ibadan."))

add("Audio & Sound — Fill the Room", "Speakers & home audio systems", "product",
    recipe_product_spotlight("Audio & Sound",
        [("Hisense Audio HS2.1 240W", "₦139,700", SHOP), ("Soundbars", "From ₦95,000", SHOP)],
        "Sound That Moves You",
        "Home theatre, soundbars and Bluetooth speakers."))

add("Solar Panels — Power From the Sun", "New solar panels & racking in stock", "product",
    recipe_product_spotlight("Solar Panels",
        [("450W mono panel", "From ₦185,000", SOLAR), ("Panel + inverter kits", "From ₦850,000", SOLAR)],
        "Turn Sunlight Into Savings",
        "High-efficiency mono panels sized for your roof and budget."))

add("Lithium Batteries — Long Life, Low Maintenance", "Lithium batteries for serious backup", "product",
    recipe_product_spotlight("Lithium Batteries",
        [("5kWh lithium", "From ₦2,400,000", SOLAR), ("10kWh+ stackable", "From ₦4,600,000", SOLAR)],
        "Backup That Lasts",
        "Deep-cycle lithium storage — more cycles, less weight, zero maintenance."))

add("Inverters & Charge Controllers", "Pure sine-wave inverters in stock", "product",
    recipe_product_spotlight("Inverters & Chargers",
        [("3.5kVA hybrid inverter", "From ₦620,000", SOLAR), ("Charge controllers", "From ₦85,000", SOLAR)],
        "The Brain of Your Solar System",
        "Hybrid inverters that switch seamlessly between sun, battery and grid."))

# ============ 3. SOLAR INSTALLATION & PACKAGES ============
add("Switch to Solar — Free Sizing & Quote", "Solar for Ibadan homes: free sizing & owner-approved quotes", "solar",
    recipe_followup("Go Solar With Leaf Solar",
        "Free sizing tool · Owner-approved quotes · Certified installation",
        "Tired of rising electricity bills and surprise outages? Leaf Solar designs solar systems for "
        "Nigerian homes and businesses — from compact home backup to industrial scale. Start with our free "
        "sizing calculator, then our team confirms the final design and written scope.",
        "Calculate my size", CALC))

add("Solar Calculator — What Can Your System Run?", "Try the free sizing tool — 60 seconds", "solar",
    shell(hero("What Can Your Solar Run?", "Use our free sizing tool to see exactly what a solar system can power in your home — then get an owner-approved quote.", "Open the calculator", CALC, style="amber") +
    two_col("Home backup", "Keep lights, fans, TV and WiFi on through outages with a tubular or lithium package.",
            "Full hybrid", "Run fridges, ACs and appliances on solar during the day and store for the night.",
            CALC) +
    feature_list(["60-second tool — no signup", "Compares tubular vs lithium", "Gives you a starting package to discuss"]) +
    cta_block("Start sizing", CALC)))

add("Tubular Packages — From ₦1,100,000", "6 tubular packages for home backup, from ₦1.1m", "solar",
    recipe_offer("Tubular Solar Packages", "Proven, affordable backup for Nigerian homes. 6 package starting points, final design confirmed by us.",
        rows=[("Tubular starter — lights & fans", "from ₦1,100,000", PKG_TUB),
              ("Tubular plus — + TV & fridge", "from ₦1,650,000", PKG_TUB),
              ("Tubular max — + inverter AC", "from ₦2,400,000", PKG_TUB)], hero_style="emerald"))

add("Lithium Packages — Long-Life Power From ₦3.8m", "5 lithium packages: 10+ year battery life", "solar",
    recipe_offer("Lithium Solar Packages", "Lithium batteries hold more cycles, charge faster and need no maintenance. 5 package starting points.",
        rows=[("Lithium starter — home essential", "from ₦3,800,000", PKG_LIT),
              ("Lithium plus — full home day/night", "from ₦5,900,000", PKG_LIT),
              ("Lithium max — heavy usage", "from ₦8,700,000", PKG_LIT)], hero_style="violet"))

add("Commercial Solar — From ₦14.8m", "2 commercial packages for shops, offices & estates", "solar",
    recipe_offer("Commercial Solar", "Cut operating costs with solar for your business. 2 commercial package starting points.",
        rows=[("Commercial standard", "from ₦14,800,000", PKG_COM),
              ("Commercial plus — larger load", "from ₦21,500,000", PKG_COM)], hero_style="dark"))

add("Industrial Solar — From ₦24.8m", "2 industrial packages for factories & heavy loads", "solar",
    recipe_offer("Industrial Solar", "Solar at industrial scale — designed, installed and supported by our team.",
        rows=[("Industrial standard", "from ₦24,800,000", PKG_IND),
              ("Industrial max — full offset", "from ₦38,000,000", PKG_IND)], hero_style="dark"))

add("Save Up to 80% on Electricity Bills", "The real math: what solar saves you each month", "solar",
    shell(hero("What If Your Next Bill Was 80% Less?", "Solar pays for itself — here's how.", None, style="emerald") +
    feature_list(["Reduce grid dependence and monthly electricity costs", "Lithium systems can run heavy loads like ACs and fridges",
                  "Tubular systems are the affordable entry point for backup", "Owner-approved written scope before installation"]) +
    pricing_table([("Tubular", "from ₦1,100,000", PKG_TUB), ("Lithium", "from ₦3,800,000", PKG_LIT), ("Commercial", "from ₦14,800,000", PKG_COM)], highlight_idx=1) +
    cta_block("Get my quote", SITE+"/solar-installation-ibadan")))

add("Free Site Assessment in Ibadan", "Book a free site assessment — we come to you", "solar",
    recipe_followup("We'll Come to You", "Free on-site assessment across Ibadan",
        "Tell us about your power needs and we'll visit your home or business, take load measurements, "
        "and design a system that fits your roof and budget — no obligation.",
        "Request assessment", SITE+"/solar-installation-ibadan"))

add("Backup Power That Never Asks for Fuel", "Solar backup vs generator — the honest comparison", "solar",
    shell(hero("Fuel Prices Keep Rising. Your Bills Don't Have To.", "Compare solar backup with what you pay for fuel today.", None, style="amber") +
    two_col("Generator", "Fuel costs every week, engine maintenance, noise and fumes, power only while it runs.",
            "Solar", "Sunlight is free. Quiet, clean, and keeps running through the night with battery storage.",
            CALC) +
    feature_list(["Tubular packages from ₦1.1m are the affordable entry point", "Lithium from ₦3.8m for long-life, low-maintenance power",
                  "Final design confirmed before any payment"]) +
    cta_block("See packages", PKG)))

add("Solar for Businesses — No More NEPA Surprises", "Keep your business running through outages", "solar",
    recipe_followup("Business Never Sleeps. Neither Should Your Power.",
        "Commercial solar from ₦14.8m",
        "Shops, offices, clinics and estates lose money every time the power goes. A properly sized solar "
        "system keeps your doors open, your fridges cold and your customers served.",
        "Explore commercial packages", PKG_COM))

add("Solar Maintenance — Keep Your System at 100%", "Servicing, cleaning & battery care", "solar",
    recipe_followup("Your System Works Hard. Maintain It.",
        "Panel cleaning · battery checks · inverter servicing",
        "A well-maintained solar system delivers more power and lasts years longer. Our team services "
        "systems in Ibadan and environs — including systems we didn't install.",
        "Book a service", SITE+"/solar-installation-ibadan"))

add("Upgrade Your Existing Solar System", "Add capacity, swap batteries, go lithium", "solar",
    recipe_followup("Already Have Solar? Let's Make It Better.",
        "Panel upgrades · battery swaps · inverter changes",
        "If your current system underperforms, we can upgrade panels, add battery capacity or move you "
        "from tubular to lithium — usually without replacing everything.",
        "Discuss an upgrade", SITE+"/solar-installation-ibadan"))

add("Solar Financing & Flexible Plans", "Spread the cost — pay in stages", "solar",
    shell(hero("Big Systems, Flexible Payment", "We'll work out a plan that fits your cashflow.", None, style="emerald") +
    feature_list(["Stage payments aligned with installation milestones", "Owner-approved quotes — no hidden costs",
                  "Transparent breakdown of every component", "Talk to us about your budget — we'll design to it"]) +
    cta_block("Talk to us", SITE+"/solar-installation-ibadan")))

add("Off-Grid Living — Power Independence", "Run your whole home on the sun", "solar",
    recipe_followup("Imagine No Outage, Ever.", "Full off-grid solar for homes & estates",
        "With enough panels and storage, your home can run completely on the sun — even through the night "
        "and rainy season. We size it properly so you're never surprised.",
        "Design my off-grid system", SOLAR))

add("Compare All 15 Packages", "Tubular, lithium, commercial & industrial — side by side", "solar",
    shell(hero("15 Packages. One Clear Choice.", "Compare every starting point on one page.", "Compare packages", PKG, style="dark") +
    pricing_table([("Tubular (6 pkgs)", "from ₦1,100,000", PKG_TUB),
                   ("Lithium (5 pkgs)", "from ₦3,800,000", PKG_LIT),
                   ("Commercial (2 pkgs)", "from ₦14,800,000", PKG_COM),
                   ("Industrial (2 pkgs)", "from ₦24,800,000", PKG_IND)], highlight_idx=1)))

add("New to Solar? Start Here", "A simple 3-step guide to going solar", "solar",
    shell(hero("Going Solar, Simply Explained", "Three steps from interest to installed.", None, style="emerald") +
    feature_list(["1. Use the sizing calculator (60 seconds)", "2. Chat with our team — we confirm the design & scope",
                  "3. We install & support you locally"], title="The Leaf Solar process") +
    cta_block("Step 1: open the calculator", CALC)))

# ============ 4. NEWSLETTERS ============
add("The Leaf Solar Monthly — August", "☀️ Your monthly update: new stock, offers & solar tips", "newsletter",
    recipe_newsletter("The Leaf Solar Monthly",
        "New arrivals, this month's offers and one solar tip.",
        "Welcome to the August edition. We've restocked TVs, added new solar packages, and there's a "
        "flash sale running all week. Below are this month's highlights.",
        items=[("Hisense 32\" Smart TV", "₦190,150", SHOP), ("LG 1.5HP Inverter AC", "₦444,300", SHOP)],
        tip="Clean your solar panels every 3 months — dust can cut output by up to 20%."))

add("New Arrivals — 12 Fresh Products", "Just landed: new TVs, appliances & solar gear", "newsletter",
    recipe_newsletter("New Arrivals Are In",
        "12 fresh listings across TVs, kitchen & solar.",
        "New stock just landed — from smart TVs to lithium batteries. Here's what's fresh this week.",
        items=[("Maxi Air Fryer", "From ₦85,000", SHOP), ("450W solar panel", "From ₦185,000", SOLAR)],
        tip="New arrivals sell fast — popular sizes sell out within days."))

add("Energy-Saving Tips for Nigerian Homes", "Cut your electricity bill with these 5 habits", "newsletter",
    recipe_newsletter("5 Ways to Pay Less for Power",
        "Small habits, real savings every month.",
        "1) Switch to inverter ACs when it's upgrade time. 2) Set your fridge to the recommended "
        "temperature. 3) Use fans before ACs. 4) Unplug devices on standby. 5) Let solar carry your "
        "daytime load — that's what it's built for.",
        tip="An inverter AC can use roughly 40% less power than a non-inverter model."))

add("Appliance Care Guide — Fridges & Freezers", "Keep your fridge running efficiently for years", "newsletter",
    recipe_newsletter("Care Guide: Fridges & Freezers",
        "Simple habits that extend the life of your cooling appliances.",
        "Leave space around the back for airflow, keep the door seals clean, defrost before ice builds "
        "up, and avoid overloading. Small habits keep your fridge cold and your bills low.",
        tip="Check your door seals: a worn seal can increase running costs noticeably."))

add("TV & Audio Buyer's Notes", "Screen sizes, soundbars & what actually matters", "newsletter",
    recipe_newsletter("TV & Audio Notes",
        "A quick guide before you buy your next screen.",
        "Match the screen to the room: 32\" suits bedrooms, 43\"+ suits living rooms. For sound, a "
        "soundbar transforms even modest TVs. Bring your room size and we'll match you.",
        items=[("Hisense TV 32A4s", "₦190,150", SHOP), ("Hisense Audio 240W", "₦139,700", SHOP)]))

add("Solar Corner — Batteries Explained", "Tubular vs lithium: which battery is right for you?", "newsletter",
    recipe_newsletter("Solar Corner: Tubular vs Lithium",
        "The two battery chemistries, plainly explained.",
        "Tubular batteries are the affordable, proven workhorse — great for daily backup. Lithium costs "
        "more upfront but lasts far longer, charges faster and needs no water topping. If you can stretch, "
        "lithium usually wins over 10 years.",
        tip="Lithium packages start at ₦3.8m; tubular at ₦1.1m."))

add("Customer Spotlight — The Adeyemi Family", "How one Ibadan family cut their bill by 70%", "newsletter",
    recipe_newsletter("Customer Spotlight",
        "Real systems, real savings.",
        "The Adeyemi family in Bodija installed a lithium package and now run their fridges, TV and "
        "lights on solar through most outages. Their grid bill dropped by roughly 70%.",
        tip="Ask us for references — we'll happily connect you with neighbours who've installed."))

add("Catalogue Highlights — 8 Categories, 90+ Products", "A tour of everything we stock", "newsletter",
    recipe_newsletter("Your Catalogue Tour",
        "TVs, fridges, ACs, washers, kitchen, fans, solar & generators.",
        "Every category we stock, in one place. If it powers your home or makes life easier, chances are "
        "we sell it — verified, warranted and supported locally.",
        items=[("Shop TVs & Audio", "20 listings", SHOP+"?c=Televisions"),
               ("Shop Solar & Inverters", "24 listings", SOLAR)],
        tip="Owner-approved quotes and secure Paystack checkout on every order."))

add("Deal of the Month — Kitchen Edition", "Kettles, air fryers & more at this month's prices", "newsletter",
    recipe_newsletter("Deal of the Month",
        "This month: kitchen & cooking essentials.",
        "Air fryers for guilt-free frying, kettles for instant hot water, and cookers for family meals. "
        "This month's kitchen deals are live on the store.",
        items=[("Maxi Kettle 1.7L", "₦19,350", SHOP), ("Air fryer", "From ₦85,000", SHOP)],
        tip="Kitchen appliances make great gifts — ask about bulk pricing for organisations."))

add("Harmattan Ready — Dry Season Checklist", "Humidifiers, kettles, fans & power for the season", "newsletter",
    recipe_newsletter("Harmattan Ready",
        "Everything you need for a comfortable dry season.",
        "Dust gets everywhere, and so does the need for fans, kettles and steady power. Tick these off "
        "before the season peaks.",
        tip="Protect electronics with surge-safe power — our solar systems include clean inverter power."))

# ============ 5. FOLLOW-UPS & NURTURE ============
add("Thank You for Your Enquiry", "Thanks for reaching out — here's what happens next", "followup",
    recipe_followup("Thanks for Reaching Out!",
        "We've received your enquiry",
        "Hello {{name}}, thank you for contacting Leaf Solar. A member of our team will get back to you "
        "within one business day with answers, options and a written quote if requested.",
        "View our products meanwhile", SHOP))

add("Your Solar Quote Is Ready", "We've prepared a written quote for your solar project", "followup",
    recipe_followup("Your Quote Is Ready, {{name}}",
        "Owner-approved pricing, written scope, no surprises",
        "Based on your requirements, we've prepared a quote for your solar system. It includes a full "
        "component breakdown, installation scope and warranty terms. Reply to this email or call us to "
        "discuss — we're happy to adjust the design to your budget.",
        "Discuss my quote", SITE+"/solar-installation-ibadan"))

add("Quick Check-In — Still Thinking Solar?", "A gentle nudge — happy to answer any questions", "followup",
    recipe_followup("Still Deciding? No Pressure.",
        "We're here when you're ready",
        "Hi {{name}}, we know going solar is a big decision. If you have questions about packages, "
        "financing or what size you need, just reply — a real person answers.",
        "Ask a question", SITE+"/solar-installation-ibadan"))

add("We Miss You — Fresh Deals Inside", "It's been a while — here's what's new", "followup",
    recipe_followup("It's Been a While, {{name}} 👋",
        "New stock and fresh offers since you last visited",
        "We've restocked TVs, added lithium solar packages and launched new offers. Thought you'd want "
        "first look.",
        "See what's new", SHOP))

add("Last Chance — Your Cart Awaits", "Items in your cart are still reserved", "followup",
    recipe_followup("Complete Your Order",
        "Your saved items are waiting",
        "You left a few items in your cart. Stock moves fast — secure your order now with our secure "
        "Paystack checkout.",
        "Return to cart", SHOP))

add("Post-Purchase Thank You", "Thanks for buying from Leaf Solar", "followup",
    recipe_followup("Thank You for Your Order!",
        "Here's what to expect next",
        "Dear {{name}}, your order is confirmed. Our team will contact you about delivery (free within "
        "Ibadan) and installation if applicable. Keep this email for warranty reference.",
        "Track your order", SITE+"/home-appliances-ibadan"))

add("How's Your New Appliance?", "Tell us about your experience — 2 minutes", "followup",
    recipe_followup("How Is Everything Running?",
        "We'd love your feedback",
        "Hi {{name}}, it's been a couple of weeks since your purchase. Is everything working well? A "
        "quick review helps other Ibadan families choose with confidence.",
        "Leave a review", SITE))

add("Warranty Reminder — Your Coverage Details", "Keep this: your warranty & support info", "followup",
    recipe_followup("Your Warranty — What's Covered",
        "Warranty info is confirmed before you buy",
        "Every product we sell comes with warranty terms confirmed in writing before purchase. This "
        "email is your reminder to keep your receipt — it's your proof of coverage.",
        "Contact support", SITE))

add("Service Due — Solar Checkup Time", "Time for your routine solar system check", "followup",
    recipe_followup("Time for a Solar Checkup",
        "Routine servicing keeps your system at peak output",
        "Regular panel cleaning and battery checks protect your investment. Our team is booking "
        "servicing slots for this month in Ibadan.",
        "Book a service", SITE+"/solar-installation-ibadan"))

add("Re-Engagement — New Solar Packages Launched", "We've added new packages since we last spoke", "followup",
    recipe_followup("Something New for You",
        "Two new commercial & industrial packages",
        "We recently launched expanded commercial and industrial solar packages. If your needs have "
        "grown, let's talk about what's possible.",
        "See new packages", PKG))

# ============ 6. ANNOUNCEMENTS ============
add("We're Now a Fouani Authorized Dealer", "Big news: official Fouani dealership", "announcement",
    shell(hero("We're Now Fouani Authorized", "Official dealership for Fouani brands — genuine stock, full warranty.", "Read the announcement", SITE, style="emerald") +
    paragraph("Leaf Solar is proud to announce our official status as a <strong>Fouani Authorized "
              "Dealer</strong>. That means genuine Hisense & LG products, factory warranty coverage and "
              "factory-trained support — direct from the authorized channel.") +
    feature_list(["100% genuine Fouani-distributed stock", "Full manufacturer warranty honoured", "Authorized service support in Ibadan"]) +
    cta_block("Shop the range", SHOP)))

add("New Category Live — Solar & Inverters", "Introducing our dedicated solar products store", "announcement",
    shell(hero("A New Home for Solar", "Our full solar & inverter range in one dedicated section.", "Explore solar products", SOLAR, style="dark") +
    paragraph("Panels, inverters, batteries, controllers and complete kits — now in one place with "
              "clear specs and prices. New solar listings added weekly.") +
    product_cards([("450W mono panel", "From ₦185,000", SOLAR), ("5kWh lithium battery", "From ₦2,400,000", SOLAR)]) +
    cta_block("Browse solar", SOLAR)))

add("Free Delivery Now Covers All of Ibadan", "Delivery update: free across Ibadan", "announcement",
    shell(hero("Free Delivery Across Ibadan", "Owner-approved quotes everywhere else.", None, style="emerald") +
    paragraph("Good news: delivery is now <strong>free across Ibadan</strong> on eligible orders. "
              "Outside Ibadan, we provide owner-approved quotes before you pay — no surprises at "
              "delivery.") +
    feature_list(["Free delivery in Ibadan on eligible orders", "Quotes confirmed before dispatch elsewhere", "Careful handling — appliances arrive damage-free"]) +
    cta_block("Shop now", SHOP)))

add("Secure Checkout Now Powered by Paystack", "Pay safely online — Paystack verified", "announcement",
    shell(hero("Checkout Is Now Extra Secure", "All online payments run through Paystack.", None, style="blue") +
    paragraph("Every online order is processed through <strong>Paystack</strong> — Nigeria's trusted "
              "payment gateway. Pay with card, transfer or USSD, and get verified confirmation.") +
    feature_list(["Card, transfer & USSD payments", "Verified payment confirmation", "Your details stay private"]) +
    cta_block("Shop securely", SHOP)))

add("We've Expanded — More Products In Stock", "Bigger catalogue, faster dispatch", "announcement",
    shell(hero("Our Catalogue Just Grew", "90+ products across 8 categories.", "Browse everything", SHOP, style="amber") +
    paragraph("From 32\" smart TVs to industrial solar, our Ibadan store now carries 90+ verified "
              "products — with more added every week.") +
    cta_block("Browse the catalogue", SHOP)))

add("Extended Opening Hours", "Now open longer — including Saturdays", "announcement",
    shell(hero("Longer Opening Hours", "Visit us — including Saturdays.", None, style="emerald") +
    feature_list(["Mon–Fri: 8:00am – 7:00pm", "Saturday: 9:00am – 6:00pm", "Call or WhatsApp before visiting for stock checks"]) +
    cta_block("Get directions", SITE)))

add("Introducing the Solar Calculator", "Free sizing tool — know your system in 60 seconds", "announcement",
    shell(hero("Introducing Our Free Sizing Tool", "Answer a few questions — see what solar can run in your home.", "Try it now", CALC, style="amber") +
    paragraph("Choosing a solar size used to be guesswork. Our calculator shows you what a system can "
              "power, suggests a starting package, and hands you straight to our team for a confirmed design.") +
    cta_block("Open the calculator", CALC)))

add("New WhatsApp Support Line", "Talk to a real person on WhatsApp", "announcement",
    shell(hero("Now on WhatsApp", "Fast answers, real people.", None, style="emerald") +
    paragraph("Questions about a product, a quote or your order? Message our team on WhatsApp for the "
              "fastest response — real local support, no bots.") +
    cta_block("Chat on WhatsApp", "https://wa.me/2348000000000")))

# ============ 7. WELCOME & ONBOARDING ============
add("Welcome to Leaf Solar", "Welcome aboard — here's what to expect", "welcome",
    shell(hero("Welcome, {{name}}! 🌞", "You're on the list. Here's what happens next.", None, style="emerald") +
    feature_list(["Early access to offers & new arrivals", "Useful guides — solar, appliances & savings",
                  "No spam. Real local support, always"]) +
    cta_block("Browse the store", SHOP)))

add("Welcome Gift — Your First-Order Discount", "A little something for joining us", "welcome",
    shell(hero("Here's a Welcome Gift 🎁", "Enjoy a discount on your first order with us.", "Shop with my discount", SHOP, style="amber") +
    paragraph("As a thank you for subscribing, enjoy a special discount on your first purchase from "
              "Leaf Solar — online or in-store.") +
    feature_list(["Valid on eligible products", "Apply at checkout", "Reach out if you need help choosing"]) +
    cta_block("Start shopping", SHOP)))

add("How It Works — Shop, Pay, Deliver", "Buying from Leaf Solar in 3 easy steps", "welcome",
    shell(hero("How Ordering Works", "Shop · Pay securely · Get it delivered.", None, style="dark") +
    feature_list(["1. Choose your product online or in-store", "2. Pay securely via Paystack — card, transfer or USSD",
                  "3. Free delivery in Ibadan, owner-approved quotes elsewhere"]) +
    cta_block("Start browsing", SHOP)))

add("Delivery & Warranty, Explained", "What to expect with every order", "welcome",
    shell(hero("Delivery & Warranty — The Simple Version", "No fine print surprises.", None, style="emerald") +
    feature_list(["Free delivery within Ibadan on eligible orders", "Outside Ibadan — quote approved by you before dispatch",
                  "Warranty terms confirmed in writing before purchase", "Keep your receipt — it's your coverage proof"]) +
    cta_block("Shop with confidence", SHOP)))

add("Meet Your Local Team", "Real people, real support, right here in Ibadan", "welcome",
    shell(hero("The Faces Behind Leaf Solar", "Local team, local knowledge.", None, style="amber") +
    paragraph("We're an Ibadan-based team — installers, technicians and product specialists who answer "
              "our own phones. Ask us anything about solar, appliances or what fits your budget.") +
    feature_list(["Call or WhatsApp — we answer", "Free sizing & assessment for solar", "After-sales support that picks up"]) +
    cta_block("Say hello", SITE)))

add("Stay Close — Follow Us", "Get offers, tips & arrivals on social", "welcome",
    shell(hero("Let's Stay Connected", "Follow Leaf Solar for daily tips and flash offers.", None, style="violet") +
    cta_block("Visit our website", SITE, sub="www.leafsolar.ng — solar · electronics · appliances")))

# ============ 8. SERVICE & SUPPORT ============
add("Professional Solar Installation", "Certified installers, clean work, written scope", "service",
    recipe_followup("Installation Done Right",
        "Certified engineers · written scope · clean work",
        "Our installation team handles everything from panel mounting to inverter wiring and battery "
        "racking. You get a written scope, a clean finish and a system we stand behind.",
        "Request installation", SITE+"/solar-installation-ibadan"))

add("Appliance Delivery & Setup", "We deliver, install and show you how", "service",
    recipe_followup("From Box to Running",
        "Delivery, setup & demonstration included on eligible orders",
        "Buy an appliance and we'll deliver it (free in Ibadan), set it up and make sure you know how "
        "to use it — before we leave.",
        "Shop appliances", SITE+"/home-appliances-ibadan"))

add("Repairs & Servicing", "Faulty appliance? We can help", "service",
    recipe_followup("Repairs Made Simple",
        "Fridges, ACs, washers, TVs & solar systems",
        "If something stops working, don't throw it out. Our technicians diagnose and repair fridges, "
        "ACs, washing machines, TVs and solar systems across Ibadan.",
        "Book a repair", SITE+"/solar-installation-ibadan"))

add("Real Local Support — Talk to a Human", "Phone, WhatsApp or walk in", "service",
    shell(hero("We Answer. Seriously.", "Call, WhatsApp or visit our store.", None, style="emerald") +
    feature_list(["Call or WhatsApp — fast replies during business hours", "Walk in and see products in person",
                  "After-sales support that doesn't disappear after payment"]) +
    cta_block("Get in touch", "https://wa.me/2348000000000")))

# ============ 9. SEASONAL & EVENTS ============
add("Eid Mubarak — Seasonal Offers", "Eid Mubarak! Celebrate with special prices", "seasonal",
    recipe_offer("Eid Mubarak 🌙", "Wishing you and your family a blessed celebration. Enjoy special prices this week.",
        items=[("Kitchen bundles", "From ₦85,000", SHOP), ("TVs & audio", "From ₦139,700", SHOP)], hero_style="emerald"))

add("Merry Christmas — Gifts That Power the Home", "Christmas gift ideas from Leaf Solar", "seasonal",
    recipe_offer("Merry Christmas 🎄", "The gift of comfort: TVs, kettles, fans and solar — gifts that keep giving.",
        cta="Shop gift ideas", hero_style="red"))

add("Happy New Year — Power Up 2026", "New year, new power. Solar deals are live", "seasonal",
    recipe_offer("Happy New Year 🎉", "Start the year with steady power and lower bills. January solar promotions are live.",
        rows=[("Tubular", "from ₦1,100,000", PKG_TUB), ("Lithium", "from ₦3,800,000", PKG_LIT)], hero_style="amber"))

add("Back to School — Study Lights & Power", "Back-to-school: study lamps, fans & power for students", "seasonal",
    recipe_offer("Back to School", "Reliable power for study time: rechargeable lights, fans and compact solar for student hostels.",
        cta="Shop study essentials", hero_style="blue"))

add("Rainy Season Preparedness", "Protect your appliances when the rains come", "seasonal",
    shell(hero("Rainy Season Is Coming", "Keep your appliances and power safe.", None, style="blue") +
    feature_list(["Surge-safe power from quality inverters", "Keep electronics off the floor in flood-prone areas",
                  "Service your generator before the wet months", "Solar keeps working — rain or shine"]) +
    cta_block("Get storm-ready", SHOP)))

add("Sallah Celebration Sale", "Sallah Mubarak — family & power, together", "seasonal",
    recipe_offer("Sallah Mubarak ✨", "Celebrate with family, powered comfortably. Special offers this week on home essentials.",
        cta="Shop the celebration", hero_style="violet"))

# ============ 10. SOCIAL PROOF & TRUST ============
add("Real Reviews From Ibadan Customers", "Hear it from your neighbours", "trust",
    shell(hero("What Ibadan Says About Us", "Real reviews from real customers.", None, style="dark") +
    testimonial("They sized our system honestly — no overselling. Installation was clean and our bill has dropped by over half.", "Mr. Tunde A.", "Bodija, Ibadan") +
    testimonial("Bought a TV and fridge. Delivered same week, set up properly, and the warranty was explained clearly.", "Mrs. Folake O.", "Ring Road, Ibadan") +
    testimonial("Asked for a quote on WhatsApp, got a straight answer, no pressure. That's why I keep coming back.", "Mr. Emeka N.", "Agodi, Ibadan") +
    cta_block("Join our happy customers", SHOP)))

add("Why Choose Leaf Solar", "The 5 reasons customers trust us", "trust",
    shell(hero("Why Ibadan Chooses Leaf Solar", "Genuine stock, honest quotes, real support.", None, style="emerald") +
    feature_list(["Fouani Authorized Dealer — genuine Hisense & LG stock", "RC7896501 — registered, established business",
                  "Secure Paystack checkout with verified confirmation", "Free delivery in Ibadan, owner-approved quotes elsewhere",
                  "Real local support — call or WhatsApp"]) +
    cta_block("Experience the difference", SHOP)))

add("Our Story — Solar & Appliances, Done Honestly", "How Leaf Solar started", "trust",
    shell(hero("Built in Ibadan, For Ibadan", "Solar installation + appliances, done honestly.", None, style="amber") +
    paragraph("Leaf Solar started with a simple frustration: power that kept failing, and appliance "
              "shopping with no one to ask. So we built what we wanted — genuine products, straight "
              "answers, and solar systems designed around real homes and real budgets.") +
    feature_list(["Solar installation: tubular → industrial", "Appliances: TVs, fridges, ACs, kitchen & more",
                  "One team that sells, installs and supports"]) +
    cta_block("Read our story", SITE)))

add("Frequently Asked Questions", "Quick answers to what customers ask us most", "trust",
    shell(hero("Your Questions, Answered", "The things everyone asks before buying.", None, style="dark") +
    feature_list(["Q: Do you deliver outside Ibadan? A: Yes — owner-approved quotes before dispatch.",
                  "Q: Is online payment safe? A: Secure Paystack checkout with verified confirmation.",
                  "Q: What warranty do I get? A: Confirmed in writing before you buy.",
                  "Q: Can you install my solar? A: Yes — certified team, written scope."]) +
    cta_block("Ask us anything", "https://wa.me/2348000000000")))

# ============ 11. EXTRA PRODUCT GUIDES ============
add("AC Buying Guide — Sizing Your Split Unit", "Which AC size? Room size & power tips", "product",
    recipe_product_spotlight("Air Conditioners",
        [("1HP — rooms up to ~120 sq ft", "From ₦270,650", SHOP), ("1.5HP+ — larger rooms", "From ₦444,300", SHOP)],
        "Pick the Right AC Size",
        "An undersized AC never cools; an oversized one wastes power. Match horsepower to room size and "
        "prefer inverter models for lower running costs."))

add("Washing Machine Guide — Front vs Twin-Tub", "Front-load, top-load or twin-tub?", "product",
    recipe_product_spotlight("Washers & Dryers",
        [("Twin-tub — budget & portable", "From ₦165,000", SHOP), ("Front-load — gentle & efficient", "From ₦310,000", SHOP)],
        "Which Washer Fits Your Home?",
        "Twin-tubs are affordable and portable; front-loaders use less water and are gentler on clothes. "
        "Tell us your household size and we'll match you."))

add("Generator Buying Guide — Match the kVA", "Right-size your generator for your home", "product",
    recipe_product_spotlight("Generators & Power",
        [("2.5kVA — lights, fans, TV, fridge", "From ₦210,000", SHOP), ("5kVA+ — ACs & heavy loads", "From ₦540,000", SHOP)],
        "The Right Generator, Sized Right",
        "Add up what you need to run at once, then size up slightly. We'll help you match kVA to your "
        "actual load — or talk to you about solar instead."))

add("Kitchen Upgrades Under ₦100,000", "Big convenience, small budget", "product",
    recipe_product_spotlight("Kitchen & Cooking",
        [("Maxi Kettle 1.7L 1500W", "₦19,350", SHOP), ("Blender & small appliances", "From ₦28,000", SHOP)],
        "Kitchen Upgrades Under ₦100k",
        "A better kettle, a reliable blender, a toaster or an air fryer — small upgrades that change "
        "everyday life without breaking the bank."))

add("Solar for Estates & Mini-Grids", "Shared power for gated communities", "solar",
    recipe_followup("Power for Your Whole Estate",
        "Mini-grid & estate-scale solar",
        "Gated communities, estates and compounds can share one properly sized solar system — designed "
        "for the combined load with fair cost sharing.",
        "Talk to us about estates", PKG_COM))

add("Inverter Sizing, Explained", "kVA, watts & what actually matters", "solar",
    shell(hero("Inverters, Plainly Explained", "kVA vs watts — and how to size yours.", None, style="emerald") +
    paragraph("The inverter is the heart of your solar system. It converts stored battery power to the "
              "230V your appliances need. Size it for your biggest simultaneous load — and always keep a "
              "little headroom.") +
    feature_list(["Tubular systems: 1–3.5kVA for home backup", "Lithium systems: 3.5–8kVA for full home coverage",
                  "Commercial/industrial: designed from a load audit"]) +
    cta_block("Get sized properly", CALC)))

add("Battery Banks Explained — How Much Storage?", "Tubular vs lithium, cycles & capacity", "solar",
    shell(hero("Battery Banks, Decoded", "How much storage do you really need?", None, style="dark") +
    paragraph("Battery capacity decides how long your home runs when the grid is down. We calculate it "
              "from your essential load and your longest typical outage.") +
    feature_list(["Tubular: proven, affordable, daily cycling", "Lithium: 3–5x more cycles, no maintenance, faster charging",
                  "We right-size — you don't pay for capacity you don't need"]) +
    cta_block("Design my battery bank", CALC)))

add("Mid-Month Surprise Sale", "Unadvertised prices — just for subscribers", "promotion",
    recipe_offer("Mid-Month Surprise", "Subscriber-only prices on select appliances. Not advertised anywhere else.",
        items=[("Hisense 32\" Smart TV", "₦190,150 <s>₦196,000</s>", SHOP),
               ("Maxi Tower Fan 28in", "₦33,500 <s>₦34,500</s>", SHOP)], hero_style="violet"))

add("First-Time Buyer Discount", "First order with us? Enjoy a discount", "promotion",
    recipe_offer("Welcome, First-Time Buyer", "Make your first Leaf Solar order and enjoy a discount on eligible products.",
        cta="Claim my first-order discount", hero_style="emerald"))

add("Student Offer — Study Power", "Students: compact solar & study essentials", "promotion",
    recipe_offer("Student Power Offer", "Reliable study power for hostels: rechargeable lights, small inverters and compact solar kits.",
        cta="See student offers", hero_style="blue"))

add("Your Quote Expires Soon", "Lock in your quoted price — 7 days left", "followup",
    recipe_followup("Your Quote Expires Soon",
        "Prices hold for 7 days",
        "Hi {{name}}, your solar quote is valid for a few more days. If you'd like to proceed or adjust "
        "the design, let us know — happy to walk you through it.",
        "Review my quote", SITE+"/solar-installation-ibadan"))

add("Installation Day — What to Expect", "Your installation is booked! Here's the plan", "followup",
    recipe_followup("Installation Day Prep",
        "Everything you need to know before we arrive",
        "Great news — your installation slot is confirmed. Expect our team for the agreed time, have "
        "access to the roof/area ready, and prepare for a clean, tidy job. We'll walk you through the "
        "system before we leave.",
        "See what to expect", SITE+"/solar-installation-ibadan"))

add("Power-Saving Home Tips", "Cut waste, keep comfort", "newsletter",
    recipe_newsletter("Power-Saving Home Tips",
        "Five practical ways to use less power today.",
        "Turn off standby devices, run your fridge at the recommended setting, use fans before ACs, "
        "wash full loads, and let solar carry daytime loads. Small habits, steady savings.",
        tip="Standby electronics can quietly add up to 10% of your bill."))

add("Kitchen of the Month — Air Fryer Edition", "Crispy, healthy, fast — the air fryer way", "newsletter",
    recipe_newsletter("Kitchen of the Month",
        "Why everyone's adding an air fryer to the kitchen.",
        "Less oil, faster cooking, easier clean-up. Air fryers have become the most-requested kitchen "
        "appliance at our store — and they're genuinely useful for busy families.",
        items=[("Air fryer", "From ₦85,000", SHOP), ("Kitchen bundles", "From ₦19,350", SHOP)]))

add("World Environment Day — Go Solar", "June 5: the cleanest power is the power you don't buy", "seasonal",
    recipe_offer("World Environment Day 🌍", "Solar isn't just cheaper — it's cleaner. Celebrate the planet with power from the sun.",
        cta="Explore solar packages", cta_url=SOLAR, hero_style="emerald"))

add("Customer Appreciation Week", "We're celebrating you — our customers", "seasonal",
    recipe_offer("Customer Appreciation Week", "Thank you for trusting Leaf Solar. Special appreciation prices all week.",
        cta="Shop the appreciation sale", hero_style="amber"))

add("Subscriber Preferences — Make It Yours", "Tell us what you'd like to hear about", "welcome",
    shell(hero("Make These Emails Yours", "Pick what you hear about — products, solar, offers.", None, style="emerald") +
    paragraph("You're in control. Prefer solar news? Product arrivals? Just offers? Tell us and we'll "
              "tailor what lands in your inbox.") +
    feature_list(["Solar installation & packages", "New appliance arrivals", "Offers & flash sales", "Tips & guides"]) +
    cta_block("Set my preferences", SITE)))

add("Restock Alert — Your Saved Item Is Back", "Back in stock: the item you were watching", "followup",
    recipe_followup("Back in Stock!",
        "The item you saved is available again",
        "Good news — an item you were watching is back in stock. Stock at this price tends to move fast, "
        "so grab it while it's here.",
        "View the item", SHOP))

add("A Big Thank You — 5-Star Support", "We see every review — thank you", "trust",
    shell(hero("Thank You for the 5 Stars ⭐", "Your reviews keep us honest.", None, style="amber") +
    paragraph("Every review helps another family in Ibadan choose with confidence. If we've served you "
              "well, a review means the world. If we could do better, tell us — we'll fix it.") +
    cta_block("Leave a review", SITE)))

add("Sell Your Old Appliance — Trade-In", "Trade in old appliances toward new ones", "service",
    recipe_followup("Trade-In, Trade Up",
        "Bring us your old appliance — get value toward a new one",
        "Upgrading? Bring your old fridge, AC, TV or washer for assessment. If it qualifies, we'll "
        "apply its value toward your new purchase. Sustainable and smart.",
        "Ask about trade-in", SITE+"/home-appliances-ibadan"))

print(f"Total templates: {len(T)}")

header = """/**
 * Leaf Solar Mailer — Professional Email Template Library
 * ---------------------------------------------
 * 100+ curated templates reflecting the real content of www.leafsolar.ng:
 * solar installation (tubular/lithium/commercial/industrial packages),
 * home appliances & electronics (TVs, fridges, ACs, washers, kitchen, fans,
 * generators), offers, newsletters, follow-ups, announcements, seasonal
 * campaigns, welcome journeys and trust/social-proof emails.
 *
 * Every template uses email-safe inline-styled HTML with the Leaf Solar brand
 * (emerald/amber), personalization tags ({{name}}, {{email}}, {{company}},
 * {{unsubscribe}}), and calls-to-action that link to the live store.
 *
 * Templates are seeded into the app database on first run via
 * seedTemplateLibrary() in lib/queries.ts (idempotent by name).
 */
import type { TemplateSeed } from '@/types';

"""

with open(OUT, "w") as f:
    f.write(header)
    f.write("export const TEMPLATE_LIBRARY: TemplateSeed[] = ")
    f.write(json.dumps(T, indent=2, ensure_ascii=False))
    f.write(";\n")

print(f"Wrote {OUT}")
