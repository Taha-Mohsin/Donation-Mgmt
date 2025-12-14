// srv/service.js
const cds = require('@sap/cds');
const { OrchestrationClient } = require('@sap-ai-sdk/orchestration');

module.exports = cds.service.impl(async function () {
  const { Donations, Donors } = this.entities;

  /**
   * Auto-populate donor snapshot fields when donor is selected
   */
  this.before(['CREATE', 'UPDATE'], 'Donations', async (req) => {
    const donation = req.data;

    // In DB this is the managed association FK column
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
   * Helper function to generate AI message
   * Used by both active and draft handlers
   */
  async function handleGenerateThankYouMessage(req, entityName) {
    console.log('🔵 generateThankYouMessage action called');
    console.log('Entity:', entityName);
    console.log('Request params:', req.params);
    
    // Get the ID - works for both draft and active
    const donationId = req.params[0]?.ID || req.params[0];
    console.log('Donation ID:', donationId);

    if (!donationId) {
      console.error('❌ No donation ID provided');
      req.error(400, 'Donation ID is required');
    }

    try {
      // Query the appropriate entity (draft or active)
      // For drafts, use the string name directly; for active, use the entity object
      let donation;
      if (entityName === 'Donations.drafts') {
        // Use CDS.ql for draft queries with string name
        donation = await SELECT.one
          .from('donation_MgmtSrv.Donations.drafts')
          .where({ ID: donationId });
      } else {
        // Use entity object for active entity
        donation = await SELECT.one
          .from(Donations)
          .where({ ID: donationId });
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

      const donor = await SELECT.one
        .from(Donors)
        .where({ ID: donation.donor_ID });
      
      if (!donor) {
        console.error('❌ Donor not found:', donation.donor_ID);
        req.error(404, 'Donor not found for this donation');
      }
      console.log('✅ Donor found:', donor);

      console.log('🤖 Generating AI message...');
      const message = await generateThankYouMessage(donation, donor);
      console.log('✅ Message generated successfully');
      console.log('Message preview:', message.substring(0, 100) + '...');
      
      // Update the appropriate entity (draft or active)
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
   * ===== Helper functions =====
   */

  async function generateThankYouMessage(donation, donor) {
    const amount = Number(donation.amount) || 0;
    const currency = donation.currencyCode || '';
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
                        - Thank them for their ${donor.isRecurringDonor ? 'continued support' : 'generous donation'}
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
            name: 'gpt-4o'
          },
          prompt: {
            template: [
              {
                role: 'system',
                content:
                  'You are an expert fundraising copywriter specializing in nonprofit campaigns. Create warm, donor-focused messages that inspire continued support.'
              },
              {
                role: 'user',
                content: promptText
              }
            ]
          }
        }
      });

      const response = await orchestrationClient.chatCompletion();
      
      // Check if response exists before trying to get content
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
      
      // Return fallback message instead of throwing error
      return generateFallbackMessage(donation, donor);
    }
  }

  function calculateImpact(amount, cause) {
    const impacts = {
      Healthcare: {
        perUnit: 400,
        unit: 'rural health checkups',
        description: 'health checkups'
      },
      Education: {
        perUnit: 500,
        unit: 'student scholarships',
        description: 'students with education'
      },
      Environment: {
        perUnit: 100,
        unit: 'trees planted',
        description: 'trees planted'
      },
      'Hunger Relief': {
        perUnit: 50,
        unit: 'meals provided',
        description: 'meals to families in need'
      },
      Hunger: {
        perUnit: 50,
        unit: 'meals provided',
        description: 'meals to families in need'
      }
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
    const currency = donation.currencyCode || '';
    const campaign = donation.campaign || 'our recent initiative';
    const cause = donation.cause || 'our community programmes';

    const impact = calculateImpact(amount, cause);

    return `Dear ${donor.name},

      Thank you for your ${donor.isRecurringDonor ? 'continued support' : 'generous donation'} to our ${campaign} campaign. Your ${amount} ${currency} donation will help ${impact}.

      Your generosity makes a real difference in the lives of those we serve. Together, we're creating lasting positive change in ${cause}.

      Warm regards.`;
  }
});