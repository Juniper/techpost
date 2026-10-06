# State, Signaling, and the Cost of Simplified Narratives

**Cbarth - 02/12/2026**

This article is not a comparison of protocols, nor an argument for or against any specific traffic engineering architecture. Instead, it is an examination of how architectural narratives form, how they simplify complex histories, and how those simplifications can quietly shape design assumptions long after the original context has faded.

![image](images/picture3.png)

## Introduction

One of the most persistent narratives in the rise of Segment Routing (SR) is that it succeeded by eliminating per-path signaling state, particularly the state associated with RSVP-TE. In this telling, RSVP is cast as an inherently complex, fragile protocol whose hop-by-hop signaling model made large-scale traffic engineering operationally untenable. SR, by contrast, is portrayed as simpler, cleaner, and more scalable precisely because it avoids this state.

This framing is compelling... but incomplete.

Per-path signaling state was not the fundamental problem RSVP exposed. Rather, RSVP made visible a set of deeper operational challenges around coupling, churn, and intent expression that SR later chose to address by changing architectural boundaries, not by eliminating state altogether. In doing so, SR arguably needed RSVP to play the role of the boogeyman to clearly articulate its own value.

This post revisits that narrative and examines how the industry interpreted RSVP's limitations, what was learned correctly, and where some conclusions may have been overly simplified.

Article initially posted here: [https://tedigest.com/2026/02/09/state-signaling-and-the-cost-of-simplified-narratives/](https://tedigest.com/2026/02/09/state-signaling-and-the-cost-of-simplified-narratives/)

## RSVP Works

RSVP-TE is widely deployed in large, sometimes very large, production networks and has been for decades. Operators successfully run:

- Hundreds of thousands of LSPs
- Refresh-reduced signaling
- Auto-Bandwidth with make-before-break and in-place bandwidth updates
- Deterministic admission control and capacity accounting
- Sub-50 msec local protection and fast global protection

From a pure scalability standpoint, RSVP has not failed the industry. Routers can hold the required per-path state, and control planes are stable when networks are well-engineered.

What operators struggle with is not the existence of state, but its behavior:

- State churn during massive failures
- Non-obvious interactions between local protection, global convergence, timers, signaling, and IGP churn
- Difficulty reasoning about why the network made a particular decision especially when searching for available bandwidth
- Limited tooling to explain outcomes in human terms

These are operational problems, not protocol-theoretic ones.  Yet over time, these issues were simplified into a single indictment: per-path signaling state is bad.

For SR to gain traction, it needed a clear differentiator. RSVP-TE provided a convenient contrast:

- RSVP: distributed, chatty, stateful, old
- SR: simple, quiet, stateless, modern

This dichotomy made SR easy to explain and easier to sell. But it required flattening a much richer history into a cautionary tale.

## SR Did Not Eliminate State. It Moved It

Segment Routing replaces hop-by-hop signaling with path encoding in the packet header (label stacking already supported by the MPLS architecture or SR Header insertion in an IPv6 tunnel encapsulation advocated for by the SRv6 architecture). But the state did not disappear; it was displaced:

- IGPs (IS-IS and OSPF) carry, and flood, the SIDs necessary for segment based forwarding
- Controllers now hold full topologic and policy state
- Telemetry pipelines maintain historical utilization data
- Path computation engines encode constraints and optimization logic on behalf of the entire network
- Databases track intent, placement, and outcomes

The router became simpler but the system, overall, has become more complex.

This trade can be a good one, but it should be acknowledged honestly. SR did not make traffic engineering stateless or simple; it made it architecturally different.

## RFC 8577: An Inconvenient Counter Example

RFC 8577 is formally titled "[Signaling RSVP-TE Tunnels on a Shared MPLS Forwarding Plane.](https://www.rfc-editor.org/rfc/rfc8577.txt)" That title alone quietly dismantles the simplistic RSVP-versus-SR framing that has taken hold.

The document does not present RSVP as something to be eliminated, nor does it frame Segment Routing as a wholesale replacement for distributed signaling. Instead, it describes an architecture in which RSVP-TE is explicitly used as the control plane to instantiate a shared, segment-routing oriented MPLS forwarding plane.

In this model, RSVP signals a label stack at the ingress, composed of shared segments. Intermediate nodes forward purely based on the MPLS stack, without maintaining per-flow labels. The forwarding plane exhibits the properties now commonly associated with SR, simplicity, scalability, and shared state, while RSVP continues to provide deterministic setup, bandwidth reservation, and admission control.

In other words, as the title makes clear:

- The forwarding plane is shared and segment-routing based
- RSVP-TE is a control-plane choice, not a data-plane mandate
- Per-path signaling is compatible with segment-routing oriented forwarding

RFC 8577 therefore stands as an explicit counterexample to the idea that SR required the rejection of RSVP. It shows that the original architectural thinking around SR was about decoupling forwarding behavior from control-plane mechanics, not about declaring distributed signaling inherently flawed.

This is an uncomfortable detail for the popular SR origin story, but an important one.

## Bandwidth Management: The Unavoidable Return

As SR deployments mature, familiar problems are reappearing:

- How much traffic can this path safely carry?
- When should flows be admitted, deferred, or rejected?
- How do we adapt to growth without oscillation?

In RSVP networks, these questions were answered preventatively through reservation and admission control. In SR networks, they are increasingly answered predictively through:

- Telemetry and historical analysis
- Tactical, threshold-based reoptimization
- Policy-based budgets and explicit slicing

Functionally, these systems are reinventing RSVP concepts, just without hop-by-hop signaling.  The difference is not what is being done, but where and how explicitly.

## Beyond MPLS: A Quiet Signal

The tendency to tightly associate RSVP with MPLS is another artifact of history rather than a fundamental architectural constraint. RSVP is, at its core, a signaling protocol for path instantiation and resource management. MPLS was simply the dominant data plane with which it was paired.

The ongoing IETF work captured in [draft-saad-teas-rsvpte-ip-tunnels](https://datatracker.ietf.org/doc/draft-saad-teas-rsvpte-ip-tunnels/) makes this explicit by describing the use of RSVP-TE to signal IP tunnels. In this model, RSVP establishes and maintains tunnel state, while the underlying forwarding plane is pure IP. The draft deliberately decouples RSVP from MPLS labels, reinforcing the idea that RSVP is a control-plane mechanism, not a data-plane technology.

This matters in the context of Segment Routing because it further weakens the argument that RSVP is inherently incompatible with SR-style forwarding. If RSVP can signal IP tunnels, there is no architectural reason it could not also be used to instantiate SRv6 paths, where the forwarding plane is IPv6-based and segment information is carried in the IPv6 tunnel encapsulation header rather than in labels.

Taken together with RFC 8577, this draft reinforces a consistent theme: RSVP has always been adaptable to different forwarding planes. The decision to abandon RSVP in many SR deployments was therefore not forced by technical incompatibility, but by an architectural preference to relocate signaling, admission control, and optimization logic outside the network.

## Extensibility and Modern TE Applications

RSVP's relevance is not limited to traditional traffic engineering deployments. Ongoing work in the IETF continues to extend RSVP to support new traffic engineering models and emerging application requirements.

The work described in [draft-kbr-teas-mptersvp](https://www.ietf.org/archive/id/draft-kbr-teas-mptersvp-02.txt) explores extensions to RSVP that enable the setup and ongoing maintenance of a Direct Acyclic Graph (DAG) in support of the concepts described in [draft-kompella-teas-mpte](https://www.ietf.org/archive/id/draft-kompella-teas-mpte-01.txt).  Rather than treating RSVP as a static protocol tied to a specific era of network design, this work positions RSVP as a flexible signaling framework capable of evolving alongside modern service and application demands.

Importantly, these extensions are orthogonal to the underlying forwarding plane. They reinforce the idea that RSVP's core value lies in its ability to describe intent, resource relationships, and lifecycle semantics, not in any particular encapsulation or data-plane technology.

This continued evolution challenges the notion that RSVP is inherently obsolete. Instead, it suggests that RSVP remains a viable tool where explicit signaling, admission control, and well-defined state semantics are operationally desirable.

## Conclusion

Segment Routing did not win, nor is it winning, because RSVP is failing or has failed. RSVP continues to thrive and shine in large bandwidth-engineered networks and deserves credit for addressing the hard problems of bandwidth management at scale. SR deserves credit for relocating those problems to a layer where some may prefer they be addressed, out of the network. But the popular narrative that SR required the rejection of RSVP, or that per-path signaling state was fundamentally incompatible with scalable networks, does not survive close inspection.

RFC 8577 makes this explicit. By describing RSVP-TE as a control plane used to instantiate a shared, segment-oriented forwarding plane, it demonstrates that SR's core architectural ideas were never dependent on eliminating distributed signaling. That this coexistence is rarely acknowledged in modern SR retrospectives says more about the power of simplifying narratives than about architectural necessity.

Understanding what RSVP actually taught us matters. Many SR deployments are already rediscovering admission control, reoptimization, and bandwidth accounting challenges under a different architecture. If we misremember the past, we risk reinventing it - this time with better dashboards, but fewer guarantees.

Architectural maturity lies not in rejecting past mechanisms wholesale, but in recognizing which tools remain viable, extensible, and appropriate as design choices rather than dogma.

## Useful links

- [https://www.rfc-editor.org/rfc/rfc8577.txt](https://www.rfc-editor.org/rfc/rfc8577.txt)
- [https://datatracker.ietf.org/doc/draft-saad-teas-rsvpte-ip-tunnels/](https://datatracker.ietf.org/doc/draft-saad-teas-rsvpte-ip-tunnels/)
- [https://www.ietf.org/archive/id/draft-kbr-teas-mptersvp-02.txt](https://www.ietf.org/archive/id/draft-kbr-teas-mptersvp-02.txt)
- [https://www.ietf.org/archive/id/draft-kompella-teas-mpte-01.txt](https://www.ietf.org/archive/id/draft-kompella-teas-mpte-01.txt)

## Glossary

- DAG: Direct Acyclic Graph
- IGP: Interior Gateway Protocol
- IPv6: Internet Protocol version 6
- LSP: Label Switched Path
- MPLS: MultiProtocol Label Switching
- RFC: Request for Comments
- RSVP-TE: Resource Reservation Protocol
- OSPF: Open Shortest Path First
- IS-IS: Intermediate System to Intermediate System
- SIDs: Segment Identifiers
- SR: Segment Routing
- SRv6: Segment Routing over IPv6
