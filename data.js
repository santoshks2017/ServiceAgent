/**
 * Mock Data Store for Dealer Campaign Portal
 * CarDekho NCBD Automated Service Agent Prototype
 */

// Helper to generate deterministic daily metrics to keep the file size clean but data rich
function generateDailyData(startDateStr, committedCPL, targetDailyBudget, totalDays = 60) {
  const dailyData = [];
  const start = new Date(startDateStr);
  const now = new Date("2026-05-25"); // Current local time base

  // Seeded random number generator for deterministic but realistic look
  let seed = 12345;
  function random() {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  for (let i = 0; i < totalDays; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);
    
    // Stop if we exceed the current mock date
    if (currentDate > now) break;

    const dateStr = currentDate.toISOString().split('T')[0];
    
    // Variance factors (weekends have lower B2B traffic but higher consumer searches)
    const dayOfWeek = currentDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const trafficFactor = isWeekend ? 1.2 : 0.95;
    const conversionFactor = isWeekend ? 0.85 : 1.1;

    // Generate daily metrics
    const dailySpend = Math.round(targetDailyBudget * (0.85 + random() * 0.3) * trafficFactor);
    const avgCPC = 25 + Math.round(random() * 8); // ₹25 - ₹33 CPC
    const clicks = Math.round(dailySpend / avgCPC);
    const ctr = 4.2 + (random() * 2.8) + (isWeekend ? 0.5 : 0); // 4.2% - 7.5% CTR
    const impressions = Math.round((clicks / (ctr / 100)));
    
    // CPL target calibration (mostly close, some locations slightly above/below)
    const baseCPL = committedCPL * (0.8 + random() * 0.45) * (1 / conversionFactor);
    const leads = Math.max(1, Math.round(dailySpend / baseCPL));
    const finalSpend = dailySpend; // actual spend
    
    // Break down by channel
    const searchShare = 0.7 + (random() * 0.1);
    const displayShare = 1 - searchShare;

    dailyData.push({
      date: dateStr,
      impressions,
      clicks,
      spend: finalSpend,
      leads,
      channels: {
        search: {
          impressions: Math.round(impressions * searchShare),
          clicks: Math.round(clicks * searchShare),
          leads: Math.round(leads * searchShare),
          spend: Math.round(finalSpend * searchShare)
        },
        display: {
          impressions: Math.round(impressions * displayShare),
          clicks: Math.round(clicks * displayShare),
          leads: Math.round(leads * displayShare),
          spend: Math.round(finalSpend * displayShare)
        }
      }
    });
  }
  return dailyData;
}

export const DEALERSHIPS = {
  "rohan_motors": {
    name: "Rohan Motors",
    phone: "9876543210",
    otp: "123456",
    locations: {
      "noida": {
        id: "noida",
        name: "Rohan Motors - Noida Sec 63",
        status: "Active",
        startDate: "2026-03-20",
        committedCPL: 450,
        totalBudget: 150000,
        billingCycle: "April 25 - May 25",
        assignedAM: "Rohan Verma",
        amEmail: "rohan.verma@cardekho.com",
        campaignName: "Creta Facelift Launch Search",
        objective: "Drive high-intent inquiries and Creta showroom bookings in Noida NCR",
        subscription: {
          status: "Active",
          planName: "Premium Agency Retainer",
          fee: 25000,
          billingCycle: "Monthly",
          nextPaymentDate: "2026-06-25",
          paymentMethod: "Visa ending in 4321",
          invoices: [
            { id: "INV-2026-008", date: "2026-05-25", amount: 25000, status: "Paid" },
            { id: "INV-2026-007", date: "2026-04-25", amount: 25000, status: "Paid" },
            { id: "INV-2026-006", date: "2026-03-25", amount: 25000, status: "Paid" }
          ]
        },
        dailyData: generateDailyData("2026-03-20", 430, 2500, 67),
        optimisations: [
          {
            date: "2026-05-24",
            title: "Enhanced Ad Copy & Structured Snippets for Creta Facelift",
            action: "Updated Google Search responsive ad copies adding active delivery and standard showroom price points. Attached showroom contact extensions.",
            why: "To improve Click-Through-Rate (CTR) and capture high-intent inquiries surrounding the newly launched Creta Facelift.",
            result: "CTR improved from 5.1% to 6.8% over the next 24 hours, yielding 4 additional direct phone lead clicks."
          },
          {
            date: "2026-05-20",
            title: "Negative Keyword Audit & Exclusions",
            action: "Audited search term report and excluded non-converting terms (e.g., 'second hand creta', 'creta toy model', 'hyundai jobs').",
            why: "Preventing budget wastage on searches looking for used cars or recruitment instead of new car buyers.",
            result: "Saved an estimated ₹3,200 in ad spend over 4 days, pulling down the average Cost-Per-Lead (CPL) to ₹420."
          },
          {
            date: "2026-05-12",
            title: "Audience Targeting Refinement (In-Market for SUVs)",
            action: "Shifted search campaign bidding preference (+15%) towards users classified by Google as 'In-Market for Mid-size SUVs'.",
            why: "Aligning bid priority with buyers showing immediate purchasing indicators.",
            result: "Leads generated from the SUV segment grew by 22% in the week following, with CPL remaining stable."
          },
          {
            date: "2026-04-28",
            title: "Demographic Bid Adjustments (Age & Location Range)",
            action: "Reduced bids by 25% for the 18-24 age group and concentrated Noida regional radius bids to a 10km circle around the dealership.",
            why: "Historical Noida data showed lower conversion volume in younger age brackets and extreme distance zones.",
            result: "Improved lead conversion rate by 1.2%, filtering out low-intent regional clicks."
          }
        ],
        tickets: [
          {
            id: "TKT-3042",
            subject: "Verify Creta leads details",
            description: "Some leads from Creta ads are coming with blank phone numbers or incorrect names. Please check lead capture form settings.",
            priority: "High",
            status: "Resolved",
            date: "2026-05-18",
            history: [
              { date: "2026-05-18", status: "Open", note: "Ticket created by Apex Hyundai Noida" },
              { date: "2026-05-19", status: "In Review", note: "Assigned AM Rohan Verma verifying Google Lead Form extension settings." },
              { date: "2026-05-20", status: "Resolved", note: "Updated Google Ads lead form extension settings to enforce valid 10-digit Indian phone verification. Verified with test leads." }
            ]
          },
          {
            id: "TKT-3095",
            subject: "Increase budget for Venue campaign",
            description: "We are getting strong queries for Venue. We want to allocate an extra ₹30,000 budget for Venue specific search ads for the next 15 days.",
            priority: "Medium",
            status: "In Review",
            date: "2026-05-24",
            history: [
              { date: "2026-05-24", status: "Open", note: "Ticket created by Apex Hyundai Noida" },
              { date: "2026-05-25", status: "In Review", note: "Rohan Verma checking campaign limits and generating budget amendment addendum." }
            ]
          }
        ],
        messages: [
          {
            sender: "am",
            text: "Hi Santosh! Welcome to the new NCBD Dealer Portal. I have set up your Noida dealership campaign logs here.",
            time: "2026-05-20T10:15:00Z"
          },
          {
            sender: "dealer",
            text: "Thanks Rohan. This dashboard looks good. I wanted to check if the CPL is on track for this week?",
            time: "2026-05-20T11:30:00Z"
          },
          {
            sender: "am",
            text: "Yes, CPL is currently averaging around ₹425, which is well below our committed ₹450 threshold. The negative keyword audit we performed yesterday should help lower it even further.",
            time: "2026-05-20T12:05:00Z"
          }
        ],
        notifications: [
          { id: 301, title: "Budget Increase Request", text: "Ticket TKT-3095 for Venue campaign budget update is In Review.", date: "2026-05-24", read: false },
          { id: 302, title: "Creta Extension Live", text: "Creta facelift structured snippets and showroom contacts live.", date: "2026-05-24", read: false },
          { id: 303, title: "Monthly Performance Report", text: "April 2026 report is ready for download.", date: "2026-05-01", read: true }
        ]
      },
      "delhi": {
        id: "delhi",
        name: "Rohan Motors - South Delhi (Okhla)",
        status: "Active",
        startDate: "2026-04-10",
        committedCPL: 500,
        totalBudget: 200000,
        billingCycle: "April 25 - May 25",
        assignedAM: "Rohan Verma",
        amEmail: "rohan.verma@cardekho.com",
        campaignName: "Hyundai SUV Range Search & Display",
        objective: "Increase Venue & Creta EV local showroom inquiries in South Delhi radius",
        subscription: {
          status: "Active",
          planName: "Standard Agency Retainer",
          fee: 20000,
          billingCycle: "Monthly",
          nextPaymentDate: "2026-06-25",
          paymentMethod: "Mastercard ending in 5543",
          invoices: [
            { id: "INV-2026-009", date: "2026-05-25", amount: 20000, status: "Paid" },
            { id: "INV-2026-008", date: "2026-04-25", amount: 20000, status: "Paid" }
          ]
        },
        dailyData: generateDailyData("2026-04-10", 520, 3500, 46), // average CPL 520 is slightly overperforming target of 500 (meaning CPL is higher, so red indicator!)
        optimisations: [
          {
            date: "2026-05-22",
            title: "Device Bid Tuning",
            action: "Increased mobile device bid modifiers by 10% and decreased tablet bids by 30%.",
            why: "Mobile clicks drive 92% of calls and lead submissions, whereas tablet traffic was non-converting.",
            result: "Lead cost lowered by ₹15 per lead over a 3-day assessment period."
          },
          {
            date: "2026-05-15",
            title: "Location Exclusions",
            action: "Excluded outer NCR areas like Faridabad and Gurgaon from the South Delhi campaign.",
            why: "Dealers noticed leads from beyond 15km rarely converted to dealership walk-ins.",
            result: "Saves ₹1,800 daily, concentrating budget entirely on South Delhi pin codes."
          },
          {
            date: "2026-05-05",
            title: "Keyword Expansion (Venue & Creta EV)",
            action: "Added high-intent phrases like 'buy Creta in south delhi', 'best price for Venue okhla', and 'Hyundai showroom near me'.",
            why: "To capture localized search traffic from customers who are in the final stages of the buying funnel.",
            result: "Search impression share increased by 14% in Okhla area, contributing to 6 new lead submissions."
          }
        ],
        tickets: [
          {
            id: "TKT-3120",
            subject: "Exclude Outer Delhi Locations",
            description: "We are getting some inquiries from Noida/Gurgaon on our South Delhi ads. Please exclude Noida and Gurgaon from our target region entirely.",
            priority: "Medium",
            status: "Resolved",
            date: "2026-05-14",
            history: [
              { date: "2026-05-14", status: "Open", note: "Ticket created by Apex Hyundai Delhi" },
              { date: "2026-05-15", status: "Resolved", note: "Noida and Gurgaon explicitly added as negative locations in campaign settings. Confirmed and closed." }
            ]
          },
          {
            id: "TKT-3150",
            subject: "Add showroom call extensions",
            description: "Please add our direct Okhla reception phone line (011-4050XXXX) as a call extension on all active search ads.",
            priority: "Low",
            status: "In Review",
            date: "2026-05-24",
            history: [
              { date: "2026-05-24", status: "Open", note: "Ticket created by Apex Hyundai Delhi" },
              { date: "2026-05-25", status: "In Review", note: "Rohan Verma verifying phone ownership and configuring call extension hours." }
            ]
          }
        ],
        messages: [
          {
            sender: "am",
            text: "Hello Team Apex. South Delhi campaign is live. Let me know if you have any questions.",
            time: "2026-04-10T09:00:00Z"
          },
          {
            sender: "dealer",
            text: "Hi Rohan, thanks. We noticed some leads are coming from far away. Can we restrict it to Okhla and surroundings?",
            time: "2026-05-14T11:00:00Z"
          },
          {
            sender: "am",
            text: "Sure! I have raised a ticket TKT-3120 to exclude Gurgaon and Noida. I'll also add negative locations.",
            time: "2026-05-14T11:45:00Z"
          },
          {
            sender: "am",
            text: "Update: I've excluded Noida and Gurgaon. The campaign is now focused strictly within a 15km radius of your Okhla showroom.",
            time: "2026-05-15T15:30:00Z"
          },
          {
            sender: "dealer",
            text: "Excellent. The lead quality seems to have improved. We also raised a request to add our phone number as a call extension.",
            time: "2026-05-24T10:00:00Z"
          },
          {
            sender: "am",
            text: "Yes, I see ticket TKT-3150. I am on it and will configure it to show only during showroom hours (9 AM - 8 PM).",
            time: "2026-05-25T09:15:00Z"
          }
        ],
        notifications: [
          { id: 101, title: "Call Extension Request", text: "Ticket TKT-3150 is now In Review with Rohan Verma.", date: "2026-05-25", read: false },
          { id: 102, title: "Report Available", text: "April 2026 Campaign Report is ready for download.", date: "2026-05-01", read: true },
          { id: 103, title: "Targeting Exclusions Applied", text: "Outer NCR areas excluded from South Delhi campaign.", date: "2026-05-15", read: true }
        ]
      }
    }
  },
  "sethi_mahindra": {
    name: "Sethi Mahindra Motors",
    phone: "9123456789",
    otp: "654321",
    locations: {
      "mumbai": {
        id: "mumbai",
        name: "Sethi Mahindra - Mumbai West",
        status: "Active",
        startDate: "2026-03-01",
        committedCPL: 650,
        totalBudget: 300000,
        billingCycle: "May 01 - May 31",
        assignedAM: "Priyanka Sen",
        amEmail: "priyanka.sen@cardekho.com",
        campaignName: "Scorpio-N & XUV700 High-Intent Search",
        objective: "Capture Scorpio-N booking intent queries and drive premium doorstep test drives",
        subscription: {
          status: "Active",
          planName: "Enterprise Agency Retainer",
          fee: 35000,
          billingCycle: "Monthly",
          nextPaymentDate: "2026-06-01",
          paymentMethod: "HDFC Visa ending in 9876",
          invoices: [
            { id: "INV-2026-005", date: "2026-05-01", amount: 35000, status: "Paid" },
            { id: "INV-2026-004", date: "2026-04-01", amount: 35000, status: "Paid" },
            { id: "INV-2026-003", date: "2026-03-01", amount: 35000, status: "Paid" }
          ]
        },
        dailyData: generateDailyData("2026-03-01", 610, 5000, 86),
        optimisations: [
          {
            date: "2026-05-25",
            title: "XUV700 Ad Copy Refinement",
            action: "Updated headline extensions to highlight 'Immediate Delivery on Select Variants' and 'Test Drive at Doorstep'.",
            why: "Competitor dealerships are listing 2-month waiting periods. Highlighting immediate availability grabs urgent buyer interest.",
            result: "CTR spiked to 7.2% today, capturing 8 premium SUV leads."
          },
          {
            date: "2026-05-18",
            title: "Budget Redistribution (Scorpio-N Focus)",
            action: "Allocated 65% of campaign budget to Scorpio-N and reduced XUV300 budget.",
            why: "Scorpio-N is seeing 3x higher search intent in Mumbai West area relative to XUV300.",
            result: "Lead count increased by 14 within 5 days, keeping CPL stable at ₹615."
          },
          {
            date: "2026-05-08",
            title: "Bidding Strategy Transition to Target CPA",
            action: "Switched bidding configuration from Maximize Clicks to Maximize Conversions (Target CPA set at ₹650).",
            why: "The campaign has accumulated enough historical conversion data (30+ leads) for Google's machine learning algorithm to optimize for cost-per-acquisition.",
            result: "CPL stabilized at ₹610 with a steady conversion rate of 8.5%."
          }
        ],
        tickets: [
          {
            id: "TKT-2900",
            subject: "Update showroom timings in ad extensions",
            description: "Our showroom timing changed to 9 AM - 8:30 PM. Please update Google callouts and location extension info.",
            priority: "Low",
            status: "Resolved",
            date: "2026-05-10",
            history: [
              { date: "2026-05-10", status: "Open", note: "Ticket created" },
              { date: "2026-05-11", status: "Resolved", note: "Timings updated in Google Business Profiles and active Callout assets." }
            ]
          },
          {
            id: "TKT-2950",
            subject: "Increase daily budget allocation",
            description: "We want to boost Scorpio-N campaign daily limit by ₹1,500 to capture weekend spikes.",
            priority: "Medium",
            status: "In Review",
            date: "2026-05-24",
            history: [
              { date: "2026-05-24", status: "Open", note: "Ticket created by Sethi Mahindra" },
              { date: "2026-05-25", status: "In Review", note: "Priyanka Sen preparing budget amendment document for confirmation." }
            ]
          }
        ],
        messages: [
          {
            sender: "am",
            text: "Hi Sethi Motors team. Priyanka here. Your Mumbai campaign is showing highly efficient CPL numbers.",
            time: "2026-05-15T14:20:00Z"
          },
          {
            sender: "dealer",
            text: "Hi Priyanka, yes, we are happy with the Scorpio-N leads. XUV300 is a bit slow though.",
            time: "2026-05-17T10:00:00Z"
          },
          {
            sender: "am",
            text: "I agree. Scorpio-N is generating 3x higher search interest. I recommend redistributing budget: allocating 65% to Scorpio-N and reducing XUV300. Shall we proceed?",
            time: "2026-05-18T09:30:00Z"
          },
          {
            sender: "dealer",
            text: "Yes, go ahead. Let's maximize Scorpio-N.",
            time: "2026-05-18T10:15:00Z"
          },
          {
            sender: "am",
            text: "Perfect, done! I've also updated XUV700 ad copy to highlight immediate delivery variants to capture urgent queries.",
            time: "2026-05-25T11:00:00Z"
          }
        ],
        notifications: [
          { id: 201, title: "Ad Copy Updated", text: "XUV700 immediate delivery headlines are now live.", date: "2026-05-25", read: false },
          { id: 202, title: "Budget Reallocation Complete", text: "65% budget shifted to Scorpio-N campaign.", date: "2026-05-18", read: true },
          { id: 203, title: "Monthly Report Generated", text: "April 2026 PDF report is available in the Reports section.", date: "2026-05-01", read: true }
        ]
      }
    }
  },
  "malhotra_hyundai": {
    name: "Malhotra Hyundai",
    phone: "9555555555",
    otp: "555555",
    locations: {
      "ghaziabad": {
        id: "ghaziabad",
        name: "Malhotra Hyundai - Ghaziabad",
        status: "Pending Ads Connection",
        startDate: "2026-06-11",
        committedCPL: 450,
        totalBudget: 120000,
        billingCycle: "June 11 - July 11",
        assignedAM: "Rohan Verma",
        amEmail: "rohan.verma@cardekho.com",
        campaignName: "Unconfigured Campaign",
        objective: "Pending setup and execution by CarDekho NCBD team",
        subscription: null,
        dailyData: [],
        optimisations: [],
        tickets: [],
        messages: [],
        notifications: []
      }
    }
  }
};

export const ACCOUNT_MANAGERS = {
  "rohan_verma": {
    id: "rohan_verma",
    name: "Rohan Verma",
    phone: "9999999999",
    otp: "111111",
    assignedDealers: ["rohan_motors", "malhotra_hyundai"]
  },
  "priyanka_sen": {
    id: "priyanka_sen",
    name: "Priyanka Sen",
    phone: "8888888888",
    otp: "222222",
    assignedDealers: ["sethi_mahindra"]
  }
};

