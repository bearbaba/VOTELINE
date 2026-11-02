# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""VOTELINE DelegatedBallot: a wallet-bound, capped experimental ballot."""
from genlayer import *
import json

def require(ok: bool, why: str):
    if not ok:
        raise gl.vm.UserError(why)

class DelegatedBallot(gl.Contract):
    registry: Address
    ballot_count: u256
    ballots: TreeMap[u256, str]
    used_by_mandate: TreeMap[u256, u256]
    voted_pair: TreeMap[str, u256]
    voted_member_proposal: TreeMap[str, u256]

    def __init__(self, registry_address: str):
        self.registry = Address(registry_address)
        self.ballot_count = u256(0)

    def _key(self, mandate_id: int, proposal_id: int) -> str:
        return str(mandate_id) + ":" + str(proposal_id)

    @gl.public.write
    def cast_vote(self, mandate_id: int, proposal_id: int, choice: str) -> int:
        require(choice in ("FOR", "AGAINST"), "invalid vote choice")
        actor = gl.message.sender_address.as_hex.lower()
        registry = gl.get_contract_at(self.registry)
        raw = registry.view().authorization(mandate_id, proposal_id, actor)
        require(type(raw) is str and 1 < len(raw) <= 1024, "invalid registry response")
        auth = json.loads(raw)
        require(auth.get("allowed") is True, "no current delegated authorization")
        require(auth.get("mandate_id") == mandate_id and auth.get("proposal_id") == proposal_id,
                "mismatched authorization")
        require(auth.get("delegate") == actor and auth.get("direction") == choice,
                "delegate or direction mismatch")
        limit = auth.get("max_votes")
        require(type(limit) is int and 1 <= limit <= 20, "invalid vote cap")
        owner = auth.get("owner")
        require(type(owner) is str and len(owner) == 42
                and owner.startswith("0x") and owner != actor, "invalid member")
        # One member may create several mandates. They must not multiply their
        # voting power on the same proposal by selecting a second mandate.
        member_key = owner.lower() + ":" + str(proposal_id)
        require(self.voted_member_proposal.get(member_key, u256(0)) == u256(0),
                "member already voted on this proposal")
        key = self._key(mandate_id, proposal_id)
        require(self.voted_pair.get(key, u256(0)) == u256(0), "already voted on this proposal")
        used = self.used_by_mandate.get(u256(mandate_id), u256(0))
        require(int(used) < limit, "mandate voting cap reached")
        self.ballot_count += u256(1)
        ballot_id = int(self.ballot_count)
        self.ballots[u256(ballot_id)] = json.dumps({
            "id": ballot_id, "mandate_id": mandate_id, "proposal_id": proposal_id,
            "actor": actor, "owner": owner, "choice": choice,
            "mandate_version": auth["version"]
        }, sort_keys=True, separators=(",", ":"))
        self.voted_pair[key] = u256(ballot_id)
        self.voted_member_proposal[member_key] = u256(ballot_id)
        self.used_by_mandate[u256(mandate_id)] = used + u256(1)
        return ballot_id

    @gl.public.view
    def get_ballot(self, ballot_id: int) -> str:
        require(type(ballot_id) is int and 0 < ballot_id <= int(self.ballot_count), "unknown ballot")
        return self.ballots[u256(ballot_id)]

    @gl.public.view
    def ballot_for(self, mandate_id: int, proposal_id: int) -> str:
        i = self.voted_pair.get(self._key(mandate_id, proposal_id), u256(0))
        return self.ballots[i] if i != u256(0) else ""

    @gl.public.view
    def member_ballot_for(self, owner: str, proposal_id: int) -> str:
        require(type(owner) is str and len(owner) == 42 and owner.startswith("0x"),
                "invalid member address")
        require(type(proposal_id) is int and proposal_id > 0, "invalid proposal")
        index = self.voted_member_proposal.get(owner.lower() + ":" + str(proposal_id), u256(0))
        return self.ballots[index] if index != u256(0) else ""

    @gl.public.view
    def mandate_usage(self, mandate_id: int) -> int:
        return int(self.used_by_mandate.get(u256(mandate_id), u256(0)))

    @gl.public.view
    def stats(self) -> str:
        return json.dumps({"ballots": int(self.ballot_count), "registry": self.registry.as_hex}, sort_keys=True)
