// srv/service.js
const cds = require('@sap/cds');
const { OrchestrationClient } = require('@sap-ai-sdk/orchestration');

module.exports = cds.service.impl(async function () {
  const { Donations, Donors, Analytics } = this.entities;

  /**
   * =================== ANALYTICS HANDLERS ===================
   */

  /**
   * Before CREATE / UPDATE on Analytics
   * - Uses periodStart + periodEnd from the UI
   * - Computes totalDonations, totalAmount, narrative for that range
   */
  this.before(['CREATE', 'UPDATE'], 'Analytics', async (req) => {
    console.log('🔵 Analytics before CREATE/UPDATE called:', req.data);

    const { periodStart, periodEnd } = req.data;

    if (!periodStart || !periodEnd) {
      console.log('ℹ️ No periodStart/periodEnd provided, skipping analytics calculation');
      return;
    }

    try {
      const analytics = await computeAnalytics(periodStart, periodEnd);

      req.data.totalDonations = analytics.totalDonations;
      req.data.totalAmount = analytics.totalAmount;
      req.data.narrative = analytics.narrative;

      console.log('✅ Analytics fields set on req.data', {
        totalDonations: req.data.totalDonations,
        totalAmount: req.data.totalAmount,
      });
    } catch (err) {
      console.error('❌ Error computing analytics:', err);
      req.error(500, 'Failed to generate analytics: ' + err.message);
    }
  });

  /**
   * Bound action Analytics.generate()
   * - Recomputes totals + narrative for the selected Analytics row
   *   using its stored periodStart / periodEnd
   */
  this.on('generate', 'Analytics', async (req) => {
    console.log('🔵 Analytics generate action called');

    try {
      const analyticsId = req.params[0]?.ID || req.params[0];
      if (!analyticsId) {
        req.error(400, 'Analytics ID is required for generate');
      }

      const existing = await SELECT.one.from(Analytics).where({ ID: analyticsId });
      if (!existing) {
        req.error(404, 'Analytics record not found');
      }

      const { periodStart, periodEnd } = existing;
      if (!periodStart || !periodEnd) {
        req.error(400, 'Cannot generate analytics without periodStart and periodEnd');
      }

      console.log('📊 Recomputing analytics for', { periodStart, periodEnd });

      const analytics = await computeAnalytics(periodStart, periodEnd);

      await UPDATE(Analytics)
        .set({
          totalDonations: analytics.totalDonations,
          totalAmount: analytics.totalAmount,
          narrative: analytics.narrative,
        })
        .where({ ID: analyticsId });

      console.log('✅ Analytics insight updated');

      // Return the updated record
      return await SELECT.one.from(Analytics).where({ ID: analyticsId });
    } catch (err) {
      console.error('❌ Error generating analytics:', err);
      req.error(500, 'Failed to generate analytics: ' + err.message);
    }
  });

  /**
   * =================== DONATIONS HANDLERS ===================
   */

  /**
   * Auto-populate donor snapshot fields when donor is selected
   */
  this.before(['CREATE', 'UPDATE'], 'Donations', async (req) => {
    const donation = req.data;

    if (donation.donor_ID) {
      const donor = await SELECT.one.from(Donors).where({ ID: donation.donor_ID });

      if (donor) {
        donation.donorName = donor.name;
        donation.donorEmail = donor.email;
        donation.donorPhone = donor.phone;
      }
    }
  });

  /**
   * Validate donation amount
   */
  this.before(['CREATE', 'UPDATE'], 'Donations', (req) => {
    if (req.data.amount != null && req.data.amount <= 0) {
      req.error(400, 'Donation amount must be greater than zero');
    }
  });

  /**
   * =================== THANK-YOU MESSAGE HELPERS ===================
   */

  /**
   * Helper function to generate AI message
   * Used by both active and draft handlers
   */
  async function handleGenerateThankYouMessage(req, entityName) {
    console.log('🔵 generateThankYouMessage action called');
    console.log('Entity:', entityName);
    console.log('Request params:', req.params);

    const donationId = req.params[0]?.ID || req.params[0];
    console.log('Donation ID:', donationId);

    if (!donationId) {
      console.error('❌ No donation ID provided');
      req.error(400, 'Donation ID is required');
    }

    try {
      let donation;
      if (entityName === 'Donations.drafts') {
        donation = await SELECT.one
          .from('donation_MgmtSrv.Donations.drafts')
          .where({ ID: donationId });
      } else {
        donation = await SELECT.one.from(Donations).where({ ID: donationId });
      }

      if (!donation) {
        console.error('❌ Donation not found:', donationId);
        req.error(404, 'Donation not found');
      }
      console.log('✅ Donation found:', donation);

      if (!donation.donor_ID) {
        console.error('❌ No donor linked to this donation');
        req.error(400, 'This donation must have a donor before generating a thank you message');
      }

      const donor = await SELECT.one.from(Donors).where({ ID: donation.donor_ID });

      if (!donor) {
        console.error('❌ Donor not found:', donation.donor_ID);
        req.error(404, 'Donor not found for this donation');
      }
      console.log('✅ Donor found:', donor);

      console.log('🤖 Generating AI message...');
      const message = await generateThankYouMessage(donation, donor);
      console.log('✅ Message generated successfully');
      console.log('Message preview:', message.substring(0, 100) + '...');

      if (entityName === 'Donations.drafts') {
        await UPDATE('donation_MgmtSrv.Donations.drafts')
          .set({ summary: message })
          .where({ ID: donationId });
      } else {
        await UPDATE(Donations)
          .set({ summary: message })
          .where({ ID: donationId });
      }

      console.log('✅ Summary saved to database');

      return { message };
    } catch (err) {
      console.error('❌ Error in generateThankYouMessage:', err);
      console.error('Stack:', err.stack);
      req.error(500, 'Failed to generate AI summary: ' + err.message);
    }
  }

  /**
   * Register handler for ACTIVE entity
   */
  this.on('generateThankYouMessage', 'Donations', async (req) => {
    return handleGenerateThankYouMessage.call(this, req, 'Donations');
  });

  /**
   * Register handler for DRAFT entity (when editing)
   */
  this.on('generateThankYouMessage', 'Donations.drafts', async (req) => {
    return handleGenerateThankYouMessage.call(this, req, 'Donations.drafts');
  });

  /**
   * =================== ANALYTICS CORE FUNCTIONS ===================
   */

  /**
   * Compute analytics from donations data between periodStart and periodEnd
   * periodStart / periodEnd are expected as 'YYYY-MM-DD' (strings) or Date objects.
   */
   /**
   * Compute analytics from donations data BETWEEN periodStart and periodEnd (inclusive)
   * periodStart / periodEnd can be 'YYYY-MM-DD' strings or Date objects.
   */
  async function computeAnalytics(periodStart, periodEnd) {
    if (!periodStart || !periodEnd) {
      throw new Error('periodStart and periodEnd are required for analytics');
    }

    // Normalise to 'YYYY-MM-DD'
    const fromDate = periodStart instanceof Date ? periodStart : new Date(periodStart);
    const toDate   = periodEnd   instanceof Date ? periodEnd   : new Date(periodEnd);

    const from = fromDate.toISOString().split('T')[0];
    const to   = toDate.toISOString().split('T')[0];

    console.log('📊 Computing analytics strictly from', from, 'to', to);

    // ✅ Use explicit where string so we KNOW the condition is correct
    const donations = await SELECT.from(Donations)
      .where`donationDate >= ${from} and donationDate <= ${to}`;

    console.log(`✅ Found ${donations.length} donations in selected period`);

    if (donations.length === 0) {
      return {
        narrative: `No donation data available between ${from} and ${to} to generate insights.`,
        totalDonations: 0,
        totalAmount: 0
      };
    }

    // Log min/max donation dates in this subset (for sanity)
    const dates = donations
      .map(d => d.donationDate)
      .filter(Boolean)
      .sort();
    console.log('🗓 Date range in result:', dates[0], '→', dates[dates.length - 1]);

    const stats = calculateAnalytics(donations);
    console.log('✅ Analytics calculated for selected period:', {
      totalDonations: stats.totalDonations,
      totalAmount: stats.totalAmount
    });

    const narrative = await generateAINarrative(stats);
    console.log('✅ Narrative generated successfully');

    return {
      narrative,
      totalDonations: stats.totalDonations,
      totalAmount: stats.totalAmount
    };
  }


  function calculateAnalytics(donations) {
    const total = donations.length;

    // Campaign analysis
    const campaignStats = {};
    const causeStats = {};
    const cityStats = {};
    const monthlyStats = {};

    let totalAmount = 0;

    donations.forEach((d) => {
      const amount = Number(d.amount) || 0;
      totalAmount += amount;

      // By campaign
      if (d.campaign) {
        campaignStats[d.campaign] = (campaignStats[d.campaign] || 0) + amount;
      }

      // By cause
      if (d.cause) {
        causeStats[d.cause] = (causeStats[d.cause] || 0) + amount;
      }

      // By city
      if (d.city) {
        cityStats[d.city] = (cityStats[d.city] || 0) + amount;
      }

      // By month
      if (d.donationDate) {
        const month = d.donationDate.substring(0, 7); // YYYY-MM
        monthlyStats[month] = (monthlyStats[month] || 0) + amount;
      }
    });

    // Top causes by percentage
    const topCauses = Object.entries(causeStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cause, amount]) => ({
        cause,
        amount,
        percentage: ((amount / totalAmount) * 100).toFixed(1),
      }));

    // Top cities
    const topCities = Object.entries(cityStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([city, amount]) => ({ city, amount }));

    // Month-over-month growth
    const months = Object.keys(monthlyStats).sort();
    let momGrowth = null;
    let lastMonthKey = null;
    let prevMonthKey = null;

    if (months.length >= 2) {
      lastMonthKey = months[months.length - 1];
      prevMonthKey = months[months.length - 2];

      const lastMonth = monthlyStats[lastMonthKey];
      const prevMonth = monthlyStats[prevMonthKey];

      if (prevMonth !== 0) {
        momGrowth = (((lastMonth - prevMonth) / prevMonth) * 100).toFixed(1);
      }
    }

    return {
      totalDonations: total,
      totalAmount,
      topCauses,
      topCities,
      momGrowth,
      lastMonth: lastMonthKey,
      prevMonth: prevMonthKey,
    };
  }

  async function generateAINarrative(analytics) {
    const promptText = `Generate a concise, data-driven narrative summary based on these donation analytics:

Total Donations: ${analytics.totalDonations}
Total Amount: $${analytics.totalAmount.toLocaleString()}

Top Causes (by amount):
${analytics.topCauses
  .map((c) => `- ${c.cause}: ${c.percentage}% ($${c.amount.toLocaleString()})`)
  .join('\n')}

Top Cities (by amount):
${analytics.topCities.map((c) => `- ${c.city}: $${c.amount.toLocaleString()}`).join('\n')}

${
  analytics.momGrowth
    ? `Month-over-Month Growth: ${analytics.momGrowth}% (${analytics.prevMonth} to ${analytics.lastMonth})`
    : ''
}

Requirements:
- Write a 2-3 sentence narrative that highlights the most important trends
- Focus on percentages for causes, top city contributor, and growth trends
- Use a professional, analytical tone
- Be specific with numbers and percentages
- Example style: "In the last 12 months, Education and Healthcare campaigns accounted for 65% of donations. San Francisco donors contributed the highest ($200,000), while New York showed a 20% MoM growth."

Generate only the narrative text, no additional formatting or explanations.`;

    try {
      const orchestrationClient = new OrchestrationClient({
        promptTemplating: {
          model: {
            name: 'gpt-4o',
          },
          prompt: {
            template: [
              {
                role: 'system',
                content:
                  'You are a data analyst specializing in nonprofit fundraising analytics. Create clear, concise narratives from donation data.',
              },
              {
                role: 'user',
                content: promptText,
              },
            ],
          },
        },
      });

      console.log('📞 Calling Orchestration API for narrative...');
      const response = await orchestrationClient.chatCompletion();

      if (!response) {
        throw new Error('No response from Orchestration API');
      }

      const narrative = response.getContent();

      if (!narrative) {
        throw new Error('AI response did not contain a narrative');
      }

      console.log('✅ AI narrative generation successful');
      return narrative;
    } catch (error) {
      console.error('❌ AI Narrative Error:', error.message);
      console.log('🔄 Falling back to template-based narrative');
      return generateFallbackNarrative(analytics);
    }
  }

  function generateFallbackNarrative(analytics) {
    const topCausesText = analytics.topCauses
      .slice(0, 2)
      .map((c) => c.cause)
      .join(' and ');

    const topCausesPercentage = analytics.topCauses
      .slice(0, 2)
      .reduce((sum, c) => sum + parseFloat(c.percentage), 0)
      .toFixed(0);

    const topCity = analytics.topCities[0];

    let narrative = `In the selected period, ${topCausesText} campaigns accounted for ${topCausesPercentage}% of donations.`;

    if (topCity) {
      narrative += ` ${topCity.city} donors contributed the highest ($${topCity.amount.toLocaleString()}).`;
    }

    if (analytics.momGrowth) {
      const growthSign = analytics.momGrowth > 0 ? '+' : '';
      narrative += ` Overall donations showed ${growthSign}${analytics.momGrowth}% month-over-month growth.`;
    }

    return narrative;
  }

  /**
   * =================== THANK-YOU AI GENERATION ===================
   */

  async function generateThankYouMessage(donation, donor) {
    const amount = Number(donation.amount) || 0;
    const currency =
      donation.currencyCode || donation.currencycode || ''; // be safe with naming
    const campaign = donation.campaign || 'our recent initiative';
    const cause = donation.cause || 'our community programmes';
    const impact = calculateImpact(amount, cause);

    try {
      const promptText = `Generate a warm, personalized thank you message for a donor with the following details:
- Donor Name: ${donor.name}
- Donation Amount: ${amount} ${currency}
- Campaign: ${campaign}
- Cause: ${cause}
- Estimated Impact: ${impact}
- Is Recurring Donor: ${donor.isRecurringDonor ? 'Yes' : 'No'}

Requirements:
- Start with "Dear ${donor.name},"
- Thank them for their ${
        donor.isRecurringDonor ? 'continued support' : 'generous donation'
      }
- Mention the specific campaign and cause
- Include the concrete impact their donation will have (use the estimated impact)
- Keep it warm, professional, and sincere
- Maximum 150 words
- End the message with exactly this closing on its own line: "Warm regards."
- Do NOT add any organization or person name after "Warm regards,"

Generate only the message text, no additional formatting or explanations.`;

      console.log('📞 Calling Orchestration API with GPT-4o...');

      const orchestrationClient = new OrchestrationClient({
        promptTemplating: {
          model: {
            name: 'gpt-4o',
          },
          prompt: {
            template: [
              {
                role: 'system',
                content:
                  'You are an expert fundraising copywriter specializing in nonprofit campaigns. Create warm, donor-focused messages that inspire continued support.',
              },
              {
                role: 'user',
                content: promptText,
              },
            ],
          },
        },
      });

      const response = await orchestrationClient.chatCompletion();

      if (!response) {
        throw new Error('No response from Orchestration API');
      }

      const aiMessage = response.getContent();

      if (!aiMessage) {
        throw new Error('AI response did not contain a message');
      }

      console.log('✅ AI generation via Orchestration successful');
      return aiMessage;
    } catch (error) {
      console.error('❌ AI Generation Error (Orchestration):', error.message);
      console.error('Error details:', error);
      console.log('🔄 Falling back to template-based message');

      return generateFallbackMessage(donation, donor);
    }
  }

  function calculateImpact(amount, cause) {
    const impacts = {
      Healthcare: {
        perUnit: 400,
        unit: 'rural health checkups',
        description: 'health checkups',
      },
      Education: {
        perUnit: 500,
        unit: 'student scholarships',
        description: 'students with education',
      },
      Environment: {
        perUnit: 100,
        unit: 'trees planted',
        description: 'trees planted',
      },
      'Hunger Relief': {
        perUnit: 50,
        unit: 'meals provided',
        description: 'meals to families in need',
      },
      Hunger: {
        perUnit: 50,
        unit: 'meals provided',
        description: 'meals to families in need',
      },
    };

    const key = impacts[cause] ? cause : 'Healthcare';
    const impactData = impacts[key];

    const safeAmount = Number(amount) || 0;
    let units = Math.floor(safeAmount / impactData.perUnit);
    if (!Number.isFinite(units) || units < 1) units = 1;

    return `fund ${units}+ ${impactData.unit} this month`;
  }

  function generateFallbackMessage(donation, donor) {
    const amount = Number(donation.amount) || 0;
    const currency =
      donation.currencyCode || donation.currencycode || '';
    const campaign = donation.campaign || 'our recent initiative';
    const cause = donation.cause || 'our community programmes';

    const impact = calculateImpact(amount, cause);

    return `Dear ${donor.name},

Thank you for your ${
      donor.isRecurringDonor ? 'continued support' : 'generous donation'
    } to our ${campaign} campaign. Your ${amount} ${currency} donation will help ${impact}.

Your generosity makes a real difference in the lives of those we serve. Together, we're creating lasting positive change in ${cause}.

Warm regards.`;
  }
});
