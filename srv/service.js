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

  // Generate / regenerate AI summary on CREATE and UPDATE
this.before(['CREATE', 'UPDATE'], 'Donations', async (req) => {
  // If this is a technical update with no data, skip
  if (!req.data) return;

  const { ID } = req.data;

  // Load existing donation for UPDATE to merge unchanged fields
  let existing = {};
  if (ID) {
    existing = await SELECT.one.from(Donations).where({ ID }) || {};
  }

  // Combine old + new values
  const donationForAI = { ...existing, ...req.data };

  // Need a donor to personalize the message
  const donorIdForAI = donationForAI.donor_ID || donationForAI.donor_id;
  if (!donorIdForAI) return;

  const donor = await SELECT.one.from(Donors).where({ ID: donorIdForAI });
  if (!donor) return;

  try {
    const message = await generateThankYouMessage(donationForAI, donor);

    // Write directly into the data being saved.
    // This works for both CREATE and UPDATE and does NOT cause recursion.
    req.data.summary = message;
  } catch (err) {
    console.error('Error generating AI summary in before CREATE/UPDATE:', err);
    // Do not block save if AI fails
  }
});


  /**
   * After CREATE: generate AI-powered thank you message
   */
//   this.after('CREATE', 'Donations', async (data, req) => {
//     try {
//       const created = Array.isArray(data) ? data[0] : data;
//       if (!created || !created.ID) return;

//       console.log('Donation created:', created.ID);

//       // Field names MUST match CDS: amount, currencyCode, donationDate, campaign, cause, city
//       const fullDonation = await SELECT.one
//         .from(Donations)
//         .where({ ID: created.ID })
//         .columns((d) => {
//           d.ID,
//           d.amount,
//           d.currencyCode,   // ✅ matches schema
//           d.donationDate,   // ✅ matches schema
//           d.campaign,
//           d.cause,
//           d.city,
//           d.donor((donor) => {
//             donor.ID, donor.name, donor.email, donor.phone, donor.isRecurringDonor;
//           });
//         });

//       console.log('Full donation data fetched:', fullDonation);

//       if (!fullDonation || !fullDonation.donor) {
//         console.log('No donor linked to donation – skipping AI message');
//         return;
//       }

//       const thankYouMessage = await generateThankYouMessage(fullDonation, fullDonation.donor);

//       console.log('=== AI-Generated Thank You Message ===');
//       console.log(thankYouMessage);
//       console.log('======================================');

//       // Optional: store in DB if you add a column
//       // await UPDATE(Donations).set({ thankYouMessage }).where({ ID: created.ID });

//       await UPDATE(Donations)
//       .set({ summary: thankYouMessage })
//       .where({ ID: created.ID });


//     } catch (error) {
//       console.error('Error generating thank you message:', error);
//       // Do NOT fail the transaction if AI fails
//     }
//   });

  /**
   * CAP action to regenerate message on demand:
   * action generateThankYouMessage(ID: UUID) returns { message: String; }
   */
  this.on('generateThankYouMessage', 'Donations', async (req) => {
    const donationId = req.params[0]; // or req.data.ID depending on action signature

    const donation = await SELECT.one.from(Donations).where({ ID: donationId });
    if (!donation) {
      req.error(404, 'Donation not found');
    }

    const donor = await SELECT.one.from(Donors).where({ ID: donation.donor_ID });
    if (!donor) {
      req.error(404, 'Donor not found');
    }

    const message = await generateThankYouMessage(donation, donor);
    return { message };
  });

  /**
   * ===== Helper functions =====
   */

  async function generateThankYouMessage(donation, donor) {
    try {
      const amount = Number(donation.amount) || 0;
      const currency = donation.currencyCode || '';  // ✅ use currencyCode
      const campaign = donation.campaign || 'our recent initiative';
      const cause = donation.cause || 'our community programmes';

      const impact = calculateImpact(amount, cause);

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

      console.log('Calling Orchestration (gpt-4o)...');
      const response = await orchestrationClient.chatCompletion();
      const aiMessage = response.getContent();

      if (!aiMessage) {
        throw new Error('AI response did not contain a message');
      }

      console.log('✅ AI generation via Orchestration successful');
      return aiMessage;
    } catch (error) {
      console.error('AI Generation Error (Orchestration):', error);
      console.log('Falling back to template-based message');
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
    const currency = donation.currencyCode || '';  // ✅ use currencyCode
    const campaign = donation.campaign || 'our recent initiative';
    const cause = donation.cause || 'our community programmes';

    const impact = calculateImpact(amount, cause);

    return `Dear ${donor.name},

Thank you for your ${donor.isRecurringDonor ? 'continued support' : 'generous donation'} to our ${campaign} campaign. Your ${amount} ${currency} donation will help ${impact}.

Your generosity makes a real difference in the lives of those we serve. Together, we're creating lasting positive change in ${cause}.

With heartfelt gratitude,
The ${campaign} Team`;
  }
});
