import { createClerkClient } from '@clerk/backend';
import { createAdminClient } from '@insforge/sdk';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const ins = createAdminClient({
  baseUrl: process.env.VITE_INSFORGE_URL,
  apiKey: process.env.INSFORGE_SERVICE_KEY
});

async function main() {
  const users = await clerk.users.getUserList({ limit: 50 });
  console.log(`Fetched ${users.data.length} users from Clerk.`);

  for (const u of users.data) {
    const email = u.emailAddresses[0]?.emailAddress || 'user@example.com';
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || email.split('@')[0] || 'Policyholder';
    const phone = u.phoneNumbers[0]?.phoneNumber || '+91 98765 43210';
    const custNumber = 'CUST-' + u.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();

    // Check tenant member
    const { data: member } = await ins.database
      .from('tenant_members')
      .select('tenant_id')
      .eq('clerk_user_id', u.id)
      .eq('status', 'active')
      .maybeSingle();

    let tenantId = member?.tenant_id;
    if (!tenantId) {
      console.log(`Provisioning isolated tenant for Clerk user ${u.id} (${name})...`);
      const orgName = `${name}'s Agency`;
      const cleanSlug = 'agency-' + (u.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toLowerCase() || Math.random().toString(36).slice(2, 8));
      const { data: newTenant, error: tErr } = await ins.database.from('tenants').insert([{
        name: orgName,
        slug: cleanSlug,
        status: 'active',
        branding_config: {
          onboarding_step: 0,
          onboarding_completed: false,
          organization_details: {
            agency_name: orgName,
            business_type: 'Agency / Brokerage',
            contact_name: name,
            contact_email: email,
            lines_of_insurance: ['Health Insurance', 'Motor / Auto'],
            preferred_language: 'English'
          },
          agent_config: {
            name: `${orgName} Assistant`,
            voice_style: 'Warm & Reassuring',
            greeting: `Hello! Thank you for calling ${orgName}. How can I assist you with your policy, coverage, or claim inquiry today?`,
            supported_languages: ['English', 'Hindi', 'Hinglish'],
            tone: 'Warm & Professional',
            instructions: 'Help policyholders with coverage, claims intake, and status verification. Escalate high-risk changes to staff.'
          },
          supported_workflows: ['policy_enquiries', 'fnol_intake', 'claim_status', 'renewal_enquiries', 'document_collection', 'human_handoff'],
          call_handling: {
            channel: 'browser_webrtc',
            working_hours: 'Monday - Saturday 9 AM - 8 PM IST',
            after_hours_route: 'emergency_voicemail'
          }
        }
      }]).select('id').single();

      if (tErr) {
        console.error('Tenant insert error:', tErr);
      }
      tenantId = newTenant?.id;
      if (tenantId) {
        await ins.database.from('tenant_members').insert([{
          tenant_id: tenantId,
          clerk_user_id: u.id,
          role: 'owner',
          status: 'active'
        }]);
      }
    }

    if (tenantId) {
      const { data: custRecord, error: cErr } = await ins.database.from('customers').upsert([{
        tenant_id: tenantId,
        clerk_user_id: u.id,
        customer_number: custNumber,
        name,
        email,
        phone,
        status: 'active'
      }], { onConflict: 'tenant_id,customer_number' }).select('id').single();

      if (cErr) console.error('Customer upsert error:', cErr);

      if (custRecord?.id) {
        const polNumber = 'POL-' + custNumber.replace('CUST-', '') + '-HLT';
        await ins.database.from('policies').upsert([{
          tenant_id: tenantId,
          customer_id: custRecord.id,
          policy_number: polNumber,
          policy_type: 'health',
          plan_name: 'Comprehensive Health Shield Platinum',
          nominee_name: 'Designated Nominee',
          nominee_relationship: 'Spouse',
          premium_amount: 18500.0,
          due_date: '2026-11-30',
          status: 'active'
        }], { onConflict: 'tenant_id,policy_number' });
      }
    }

    // Sync into InsForge users table
    if (email) {
      const { data: existingUser } = await ins.database.from('users').select('id').eq('email', email).limit(1);
      if (!existingUser || existingUser.length === 0) {
        await ins.database.from('users').insert([{
          id: crypto.randomUUID(),
          email,
          display_name: name,
          status: 'active'
        }]);
      }
    }

    console.log(`✓ User Registered: ${u.id} | Name: ${name} | Tenant: ${tenantId}`);
  }

  // Final check of tenant_members
  const { data: allMembers } = await ins.database.from('tenant_members').select('*');
  console.log(`\nFinal tenant_members in DB: ${allMembers?.length}`);
  allMembers?.forEach(m => console.log(`  Member: ${m.clerk_user_id} (${m.role}) -> Tenant: ${m.tenant_id}`));
}

main().catch(console.error);
