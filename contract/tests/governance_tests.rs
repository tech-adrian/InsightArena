use insightarena_contract::governance::ProposalType;
use insightarena_contract::{InsightArenaContract, InsightArenaContractClient};
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env};

// ── Helpers ────────────────────────────────────────────────────────────────────

fn register_token(env: &Env) -> Address {
    let token_admin = Address::generate(env);
    env.register_stellar_asset_contract_v2(token_admin)
        .address()
}

fn deploy(env: &Env) -> (InsightArenaContractClient<'_>, Address) {
    let id = env.register(InsightArenaContract, ());
    let client = InsightArenaContractClient::new(env, &id);
    let admin = Address::generate(env);
    let oracle = Address::generate(env);
    let xlm_token = register_token(env);
    env.mock_all_auths();
    client.initialize(&admin, &oracle, &200_u32, &xlm_token);
    (client, admin)
}

fn create_fee_proposal(
    client: &InsightArenaContractClient<'_>,
    proposer: &Address,
    duration: u64,
) -> u32 {
    client.create_proposal(proposer, &ProposalType::UpdateProtocolFee(300), &duration)
}

// ── Tests ──────────────────────────────────────────────────────────────────────

#[test]
fn test_list_proposals_empty_before_any_proposals() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _) = deploy(&env);

    // No proposals created yet — every pagination call must return an empty list.
    assert_eq!(client.list_proposals(&1_u32, &10_u32).len(), 0);
    assert_eq!(client.list_proposals(&0_u32, &10_u32).len(), 0);
}

#[test]
fn test_list_proposals_returns_all_proposals() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _) = deploy(&env);
    let proposer = Address::generate(&env);

    let id1 = create_fee_proposal(&client, &proposer, 3600);
    let id2 = create_fee_proposal(&client, &proposer, 7200);
    let id3 = create_fee_proposal(&client, &proposer, 10_800);

    let list = client.list_proposals(&1_u32, &10_u32);

    assert_eq!(list.len(), 3);
    assert_eq!(list.get(0).unwrap().proposal_id, id1);
    assert_eq!(list.get(1).unwrap().proposal_id, id2);
    assert_eq!(list.get(2).unwrap().proposal_id, id3);
}

#[test]
fn test_list_proposals_pagination_works() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _) = deploy(&env);
    let proposer = Address::generate(&env);

    for _ in 0..5 {
        create_fee_proposal(&client, &proposer, 3600);
    }

    // Page 1: IDs 1–2
    let page1 = client.list_proposals(&1_u32, &2_u32);
    assert_eq!(page1.len(), 2);
    assert_eq!(page1.get(0).unwrap().proposal_id, 1);
    assert_eq!(page1.get(1).unwrap().proposal_id, 2);

    // Page 2: IDs 3–4
    let page2 = client.list_proposals(&3_u32, &2_u32);
    assert_eq!(page2.len(), 2);
    assert_eq!(page2.get(0).unwrap().proposal_id, 3);
    assert_eq!(page2.get(1).unwrap().proposal_id, 4);

    // Page 3: ID 5 only
    let page3 = client.list_proposals(&5_u32, &2_u32);
    assert_eq!(page3.len(), 1);
    assert_eq!(page3.get(0).unwrap().proposal_id, 5);

    // Out-of-bounds start returns empty
    assert_eq!(client.list_proposals(&6_u32, &10_u32).len(), 0);

    // Limit capped at 50
    let big = client.list_proposals(&1_u32, &100_u32);
    assert_eq!(big.len(), 5); // only 5 proposals exist
}
