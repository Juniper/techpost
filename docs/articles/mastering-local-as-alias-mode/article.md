# Mastering Local AS - Alias Mode

**Juhie Mohan Motiani - 11/03/2025**

A detailed breakdown of the alias option for the local-AS setting in BGP on Juniper devices, showing how this mode influences AS-path prepending in both eBGP and iBGP peering. It covers configuration examples, route propagation scenarios, and illustrates how the local AS and global AS values are prepended differently depending on peer type.

## Introduction

This series of techpost will provide a comprehensive overview of the various BGP local AS configuration options available on Juniper devices. Local AS is a powerful feature used in scenarios such as network migrations, mergers, and acquisitions. It enables BGP sessions to present a local AS number instead of the global AS when establishing peerings. We will detail the behavior of each configuration option, covering both the iBGP and eBGP use cases. A summary table of AS paths of all the routes after each local AS option is included for quick reference and comparison.

Five local AS options are available, each catering to a range of use cases, from seamless network migrations to complex multi-homing scenarios:

- [Default](https://juniper.github.io/techposts/mastering-local-as-default-mode/article)
- [Alias (focus of this article)](https://juniper.github.io/techposts/mastering-local-as-alias-mode/article)
- [Private](https://juniper.github.io/techposts/mastering-local-as-private-mode/article)
- [No-Prepend-Global-AS](https://juniper.github.io/techposts/mastering-local-as-no-prepend-global-as/article)
- [Private No-Prepend-Global-AS](https://juniper.github.io/techposts/mastering-local-as-private-no-prepend-global-as/article)

These options allow network operators to modify AS path information, influencing how routes are perceived and propagated within and beyond their autonomous system. The following sections provide an in-depth exploration of the default option, highlighting its strengths and limitations.

## Alias Option

Syntax: ***local-as <AS-number> alias***

In Junos, the local AS alias option is used to make the router appear to a BGP peer as if it belongs to either the router's global AS or an alternate AS number (the local AS), effectively treating the local AS as an alias for the global AS. During the BGP session establishment, the AS number sent in the OPEN message can alternate between the global AS and the local AS. If the session is established using the local AS, then only the local AS is prepended to the AS path; if it is established using the global AS, then only the global AS is prepended. This is ideal during gradual migration of an acquired network where some devices use the old AS, and others use the new AS.

Note: While a router can alternate between the global AS and the local AS, the external BGP peer must still explicitly configure the peer-as knob to specify which AS it would like to peer with.

Example configuration:

```
protocols {
   bgp {
      group test {
         local-as 65551 alias;
         neighbor <address> {
            peer-as 64501;
         }
      }
   }
}
```

Key behaviors:

1. Peer Establishment: BGP sessions use either the local ASN or Global ASN in their OPEN message.
2. Local AS applied to eBGP peer:
  - Routes advertised from eBGP peers with local-as alias configuration to other eBGP peers will have the global ASN number prepended to the AS path.
  - Routes advertised from eBGP peer with local-as alias configuration to other iBGP will NOT have the local ASN or the global ASN number prepended to the AS path.
3. Local AS applied to iBGP peer:
  - Routes advertised from iBGP peers with local-as alias configuration to other eBGP peers will only have the global ASN prepended to the AS path.
  - Routes advertised from iBGP peers with local-as alias configuration to other iBGP peers will NOT have the local ASN or the global ASN prepended to the AS path.

## Scenario Overview

The primary goal of this document is to validate the behavior of the **alias local AS option** and understand how the AS path is prepended or modified in different scenarios. It takes various route propagation scenarios into account and lists the expected AS path for each route.

## AS Path Verification Points

We examine the AS path in three distinct contexts:

1. Show route advertising-protocol output. Displays the AS path that will be advertised to the neighbor, including the AS numbers being prepended.
2. Actual BGP UPDATE message content (captured via traceoptions). Reflects the AS path as it appears within the real BGP UPDATE message sent to the peer.
3. Local routing table (RIB) representation. Shows the AS path stored in the local routing table prior to any AS path modifications.

Capturing both the show route advertising-protocol output and the actual BGP UPDATE message allows us to identify and analyze any discrepancies between the intended advertisement and the actual message transmitted.

## Topology

The example environment consists of five routers arranged in a star topology, with router R3 serving as the central node and Device Under Test (DUT). Each router's global AS number is indicated within the square boxes. This is the base topology and currently does not show local-as configuration. The local-as configuration will be applied on R3 (DUT) towards either R1 (eBGP) or R4 (iBGP), depending on the specific example scenario. For each example, the topology will indicate where local-as is applied and how the route propagates. This topology is purposefully designed to thoroughly evaluate various route propagation behaviors and to analyze the effects of local AS configurations in each context.

![Topology](images/picture3.png)

## Assumptions and Considerations

- R3 is the Device Under Test (DUT), and all observations are made through R3's lens.
- The local-as configuration is always applied on R3 (DUT) towards R1 for eBGP scenarios and towards R4 for iBGP scenarios.
- Local-as configuration is only applied towards one router (either R1 or R4) for a given eBGP/iBGP scenario.
- AS number 65551 refers to the Local AS, and AS number 64503 refers to the Global AS.
- The topology used in this document is only for educational purposes and should not be used as a reference for any other purpose.

## Configuration: Local AS Alias configured towards eBGP peer (R1) - Peering on Local AS

```
R1                                      R4
[64501]                                 [64503]
(192.0.2.1/32)                          (192.0.2.4/32)
|                                       |
|  eBGP                       iBGP      |
|  (local-as 65551 alias)               |
+-------------+           +-------------+
              |           |
              |___    ____|
               ___  R3____
               (192.0.2.3/32)
              |  [64503]  |
              |           |
              |           |
+-------------+           +-------------+
|                                        |
|  eBGP                       iBGP       |
|                                        |
(192.0.2.2/32)                          (192.0.2.5/32)
R2                                      R5
[64502]                                 [64503]
```

The following five example scenarios cover all the cases where local AS alias configuration on an eBGP setup - peering on Local AS impacts the AS path.

Please note that "*" in below examples marks the neighbor on which R3 (DUT) has the local-as configuration applied.

## Example 1: Route propagation from eBGP* (R1) to eBGP (R2)

This example describes the propagation of routes learned via eBGP from R1 to the eBGP peer R2, where R3 applies a local AS alias on its eBGP session with R1. R1 advertises its loopback address 192.0.2.1/32 to R3, which then re-advertises the prefix to R2.

*AS path of prefix 192.0.2.1/32 in the routing table inet.0 on R3:*

```
RE3# run show route 192.0.2.1

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
+ = Active Route, - = Last Active, * = Both

192.0.2.1/32       *[BGP/170] 00:01:28, localpref 100
                      AS path: 64501 I, validation-state: unverified
                    >  to 198.51.100.1 via ge-0/0/0.0
```

*AS path of prefix 192.0.2.1/32 in the show route advertising-protocol output on R3:*

```
RE3# run show route advertising-protocol bgp 198.51.100.5 192.0.2.1 detail

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
* 192.0.2.1/32 (1 entry, 1 announced)
 BGP group r2 type External
     Nexthop: Self
     AS path: [64503] 64501 I
```

*AS path of prefix 192.0.2.1/32 in the BGP UPDATE message sent to R2:*

```
BGP SEND 198.51.100.6+179 -> 198.51.100.5+54569
BGP SEND message type 2 (Update) length 52
BGP SEND Update PDU length 52
BGP SEND flags 0x40 code Origin(1): IGP, length(1)
BGP SEND flags 0x40 code ASPath(2) (4-byte-cap) length 10: 64503 64501
BGP SEND flags 0x40 code NextHop(3): 198.51.100.6 length(4)
End-of-Attributes
BGP SEND         192.0.2.1/32
```

## Example 2: Route propagation from eBGP* (R1) to iBGP (R4)

This example describes the propagation of routes learned via eBGP from R1 to the iBGP peer R4, where R3 applies a local AS alias on its eBGP session with R1. R1 advertises its loopback address 192.0.2.1/32 to R3, which then re-advertises the prefix to R4.

*AS path of prefix 192.0.2.1/32 in the routing table inet.0 on R3:*

```
RE3# run show route 192.0.2.1

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
+ = Active Route, - = Last Active, * = Both

192.0.2.1/32       *[BGP/170] 00:03:17, localpref 100
                      AS path: 64501 I, validation-state: unverified
                    >  to 198.51.100.1 via ge-0/0/0.0
```

*AS path of prefix 192.0.2.1/32 in the show route advertising-protocol output on R3:*

```
RE3# run show route advertising-protocol bgp 203.0.113.1 192.0.2.1 detail

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
* 192.0.2.1/32 (1 entry, 1 announced)
 BGP group r4 type Internal
     Nexthop: Self
     Flags: Nexthop Change
     Localpref: 100
     AS path: [64503] 64501 I
```

*AS path of prefix 192.0.2.1/32 in the BGP UPDATE message sent to R4:*

```
BGP SEND 203.0.113.2+179 -> 203.0.113.1+49800
BGP SEND message type 2 (Update) length 55
BGP SEND Update PDU length 55
BGP SEND flags 0x40 code Origin(1): IGP, length(1)
BGP SEND flags 0x40 code ASPath(2) (4-byte-cap) length 6: 64501
BGP SEND flags 0x40 code NextHop(3): 203.0.113.2 length(4)
BGP SEND flags 0x40 code LocalPref(5): 100 length(4)
End-of-Attributes
BGP SEND         192.0.2.1/32
```

Notice the discrepancy in the show advertise command which indicates that the global AS will be prepended to the AS path. Whereas, in the actual BGP UPDATE message, the global AS is not prepended. Since R4 is an internal peer to R3, R3 will not prepend the global AS to the AS path.

## Example 3: Route propagation from DUT (R3) to eBGP* (R1)

This example examines the AS path of a direct/static route advertised to an eBGP peer. R3 advertises its loopback address 192.0.2.3/32 to R1.

*AS path of prefix 192.0.2.3/32 in the routing table inet.0 on R3:*

```
RE3# run show route 192.0.2.3 detail

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
192.0.2.3/32 (1 entry, 1 announced)
        *Direct Preference: 0
                Next hop type: Interface, Next hop index: 0
                Address: 0x825bd94
                Next-hop reference count: 1
                Kernel Table Id: 0
                Next hop: via lo0.0, selected
                State: <Active Int>
                Local AS: 64503
                Age: 13:22
                Validation State: unverified
                Task: IF
                Announcement bits (1): 3-Resolve tree 1
                AS path: I
                Thread: junos-main
```

*The AS path of prefix 192.0.2.3/32 as shown in the output of the show route advertising-protocol command on R3: *

```
RE3# run show route advertising-protocol bgp 198.51.100.1 192.0.2.3 detail

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
* 192.0.2.3/32 (1 entry, 1 announced)
 BGP group r1 type External
     Nexthop: Self
     AS path: [64503] I
```

The example above includes square brackets to indicate the AS number being prepended to the AS path before advertisement.

*AS path of prefix 192.0.2.1/32 in the BGP UPDATE message sent to R1:*

```
BGP SEND 198.51.100.2+51114 -> 198.51.100.1+179
BGP SEND message type 2 (Update) length 48
BGP SEND Update PDU length 48
BGP SEND flags 0x40 code Origin(1): IGP, length(1)
BGP SEND flags 0x40 code ASPath(2) (4-byte-cap) length 6: 65551
BGP SEND flags 0x40 code NextHop(3): 198.51.100.2 length(4)
End-of-Attributes
BGP SEND         192.0.2.3/32
```

Notice that the show advertise command and the BGP UPDATE message show different AS paths. Always follow the BGP UPDATE message as the source of truth.

## Example 4: Route propagation from eBGP (R2) to eBGP* (R1)

This example describes the propagation of routes learned via eBGP from R2 to the eBGP peer R1, where R3 applies a local AS alias on its eBGP session with R1. R2 advertises its loopback address 192.0.2.2/32 to R3, which then re-advertises the prefix to R1.

*AS path of prefix 192.0.2.2/32 in the routing table inet.0 on R3:*

```
RE3# run show route 192.0.2.2

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
+ = Active Route, - = Last Active, * = Both

192.0.2.2/32       *[BGP/170] 00:01:40, localpref 100
                      AS path: 64502 I, validation-state: unverified
                    >  to 198.51.100.5 via ge-0/0/2.0
```

*AS path of prefix 192.0.2.2/32 in the show route advertising-protocol output on R3:*

```
RE3# run show route advertising-protocol bgp 198.51.100.1 192.0.2.2 detail

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
* 192.0.2.2/32 (1 entry, 1 announced)
 BGP group r1 type External
     Nexthop: Self
     AS path: [64503] 64502 I
```

*AS path of prefix 192.0.2.2/32 in the BGP UPDATE message sent to R1:*

```
BGP SEND 198.51.100.2+49173 -> 198.51.100.1+179
BGP SEND message type 2 (Update) length 52
BGP SEND Update PDU length 52
BGP SEND flags 0x40 code Origin(1): IGP, length(1)
BGP SEND flags 0x40 code ASPath(2) (4-byte-cap) length 10: 65551 64502
BGP SEND flags 0x40 code NextHop(3): 198.51.100.2 length(4)
End-of-Attributes
BGP SEND         192.0.2.2/32
```

The show advertise command indicates that the global AS will be prepended, however, the BGP UPDATE message actually prepends the local AS.

## Example 5: Route propagation from iBGP (R4) to eBGP* (R1)

This example describes the propagation of routes learned via iBGP from R4 to the eBGP peer R1, where R3 applies a local AS alias on its eBGP session with R1. R4 advertises its loopback address 192.0.2.4/32 to R3, which then re-advertises the prefix to R1.

*AS path of prefix 192.0.2.4/32 in the routing table inet.0 on R3:*

```
RE3# run show route 192.0.2.4

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
+ = Active Route, - = Last Active, * = Both

192.0.2.4/32       *[BGP/170] 00:01:04, localpref 100
                      AS path: I, validation-state: unverified
                    >  to 203.0.113.1 via ge-0/0/4.0
```

*AS path of prefix 192.0.2.4/32 in the show route advertising-protocol output on R3:*

```
RE3# run show route advertising-protocol bgp 198.51.100.1 192.0.2.4 detail

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
* 192.0.2.4/32 (1 entry, 1 announced)
 BGP group r1 type External
     Nexthop: Self
     AS path: [64503] I
```

*AS path of prefix 192.0.2.4/32 in the BGP UPDATE message sent to R1:*

```
BGP SEND 198.51.100.2+65453 -> 198.51.100.1+179
BGP SEND message type 2 (Update) length 48
BGP SEND Update PDU length 48
BGP SEND flags 0x40 code Origin(1): IGP, length(1)
BGP SEND flags 0x40 code ASPath(2) (4-byte-cap) length 6: 65551
BGP SEND flags 0x40 code NextHop(3): 198.51.100.2 length(4)
End-of-Attributes
BGP SEND         192.0.2.4/32
```

## Alias local AS Option Behavior for an eBGP Peer - Peering with Local AS

| Route Direction(S -> DUT -> D) | As PathLocal RIB | AS Path(show adv to "D") | UPDATE MESSAGEto "D" | ASPATH_PREPENDby DUT |
|:--|:--|:--|:--|:--|
| R1 -> R3 -> R2 | 64501 I | [64503] 64501 I | 64503 64501 I | Global-as |
| R1 -> R3 -> R4 | 64501 I | [64503] 64501 I | 65551 I |  |
| R3 -> R1 | I | [64503] I | 65551 I | Local-as |
| R2 -> R3 -> R1 | 64502 I | [64503] 64502 I | 65551 64502 I | Global-as |
| R4 -> R3 -> R1 | I | [64503] I | 65551 I | Local-as |

## Configuration: Local AS Alias configured towards eBGP peer (R1) - Peering on Global AS

```
R1                                      R4
[64501]                                 [64503]
(192.0.2.1/32)                          (192.0.2.4/32)
|                                       |
|  eBGP                       iBGP      |
|  (local-as 65551 alias)               |
+-------------+           +-------------+
              |           |
              |___    ____|
               ___  R3____
               (192.0.2.3/32)
              |  [64503]  |
              |           |
              |           |
+-------------+           +-------------+
|                                        |
|  eBGP                       iBGP       |
|                                        |
(192.0.2.2/32)                          (192.0.2.5/32)
R2                                      R5
[64502]                                 [64503]
```

The following five example scenarios cover all the cases where local AS alias configuration on an eBGP setup - peering on Global AS impacts the AS path.

## Example 1: Route propagation from eBGP* (R1) to eBGP (R2)

This example describes the propagation of routes learned via eBGP from R1 to the eBGP peer R2, where R3 applies a local AS alias on its eBGP session with R1. R1 advertises its loopback address 192.0.2.1/32 to R3, which then re-advertises the prefix to R2.

*AS path of prefix 192.0.2.1/32 in the routing table inet.0 on R3:*

```
RE3# run show route 192.0.2.1

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
+ = Active Route, - = Last Active, * = Both

192.0.2.1/32       *[BGP/170] 00:05:39, localpref 100
                      AS path: 64501 I, validation-state: unverified
                    >  to 198.51.100.1 via ge-0/0/0.0
```

*AS path of prefix 192.0.2.1/32 in the show route advertising-protocol output on R3:*

```
RE3# run show route advertising-protocol bgp 198.51.100.5 192.0.2.1 detail

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
* 192.0.2.1/32 (1 entry, 1 announced)
 BGP group r2 type External
     Nexthop: Self
     AS path: [64503] 64501 I
```

*AS path of prefix 192.0.2.1/32 in the BGP UPDATE message sent to R2:*

```
BGP SEND 198.51.100.6+179 -> 198.51.100.5+57494
BGP SEND message type 2 (Update) length 52
BGP SEND Update PDU length 52
BGP SEND flags 0x40 code Origin(1): IGP, length(1)
BGP SEND flags 0x40 code ASPath(2) (4-byte-cap) length 10: 64503 64501
BGP SEND flags 0x40 code NextHop(3): 198.51.100.6 length(4)
End-of-Attributes
BGP SEND         192.0.2.1/32
```

## Example 2: Route propagation from eBGP* (R1) to iBGP (R4)

This example describes the propagation of routes learned via eBGP from R1 to the iBGP peer R4, where R3 applies a local AS alias on its eBGP session with R1. R1 advertises its loopback address 192.0.2.1/32 to R3, which then re-advertises the prefix to R4.

*AS path of prefix 192.0.2.1/32 in the routing table inet.0 on R3:*

```
RE3# run show route 192.0.2.1

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
+ = Active Route, - = Last Active, * = Both

192.0.2.1/32       *[BGP/170] 00:05:39, localpref 100
                      AS path: 64501 I, validation-state: unverified
                    >  to 198.51.100.1 via ge-0/0/0.0
```

*AS path of prefix 192.0.2.1/32 in the show route advertising-protocol output on R3:*

```
RE3# run show route advertising-protocol bgp 203.0.113.1 192.0.2.1 detail

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
* 192.0.2.1/32 (1 entry, 1 announced)
 BGP group r4 type Internal
     Nexthop: Self
     Flags: Nexthop Change
     Localpref: 100
     AS path: [64503] 64501 I
```

*AS path of prefix 192.0.2.1/32 in the BGP UPDATE message sent to R4:*

```
BGP SEND 203.0.113.2+179 -> 203.0.113.1+63411
BGP SEND message type 2 (Update) length 55
BGP SEND Update PDU length 55
BGP SEND flags 0x40 code Origin(1): IGP, length(1)
BGP SEND flags 0x40 code ASPath(2) (4-byte-cap) length 6: 64501
BGP SEND flags 0x40 code NextHop(3): 203.0.113.2 length(4)
BGP SEND flags 0x40 code LocalPref(5): 100 length(4)
End-of-Attributes
BGP SEND         192.0.2.1/32
```

We see that the UPDATE message does not include the global AS in the AS path. This is because R4 is an internal peer to R3, and they belong to the same AS.

## Example 3: Route propagation from DUT (R3) to eBGP* (R1)

This example examines the AS path of a direct/static route advertised to an eBGP peer. R3 advertises its loopback address 192.0.2.3/32 to R1.

*AS path of prefix 192.0.2.3/32 in the routing table inet.0 on R3:*

```
RE3# run show route 192.0.2.3 detail

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
192.0.2.3/32 (1 entry, 1 announced)
        *Direct Preference: 0
                Next hop type: Interface, Next hop index: 0
                Address: 0x825bd94
                Next-hop reference count: 1
                Kernel Table Id: 0
                Next hop: via lo0.0, selected
                State: <Active Int>
                Local AS: 64503
                Age: 48:05
                Validation State: unverified
                Task: IF
                Announcement bits (1): 3-Resolve tree 1
                AS path: I
                Thread: junos-main
```

*The AS path of prefix 192.0.2.3/32 as shown in the output of the show route advertising-protocol command on R3:*

```
RE3# run show route advertising-protocol bgp 198.51.100.1 192.0.2.3 detail

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
* 192.0.2.3/32 (1 entry, 1 announced)
 BGP group r1 type External
     Nexthop: Self
     AS path: [64503] I
```

The example above includes square brackets to indicate the AS number being prepended to the AS path before advertisement

AS path of prefix 192.0.2.1/32 in the BGP UPDATE message sent to R1:

```
BGP SEND 198.51.100.2+58251 -> 198.51.100.1+179
BGP SEND message type 2 (Update) length 48
BGP SEND Update PDU length 48
BGP SEND flags 0x40 code Origin(1): IGP, length(1)
BGP SEND flags 0x40 code ASPath(2) (4-byte-cap) length 6: 64503
BGP SEND flags 0x40 code NextHop(3): 198.51.100.2 length(4)
End-of-Attributes
BGP SEND         192.0.2.3/32
```

## Example 4: Route propagation from eBGP (R2) to eBGP* (R1)

This example describes the propagation of routes learned via eBGP from R2 to the eBGP peer R1, where R3 applies a local AS alias on its eBGP session with R1. R2 advertises its loopback address 192.0.2.2/32 to R3, which then re-advertises the prefix to R1.

*AS path of prefix 192.0.2.2/32 in the routing table inet.0 on R3:*

```
RE3# run show route 192.0.2.2

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
+ = Active Route, - = Last Active, * = Both

192.0.2.2/32       *[BGP/170] 00:00:50, localpref 100
                    AS path: 64502 I, validation-state: unverified
                  >  to 198.51.100.5 via ge-0/0/2.0
```

*AS path of prefix 192.0.2.2/32 in the show route advertising-protocol output on R3:*

```
RE3# run show route advertising-protocol bgp 198.51.100.1 192.0.2.2 detail

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
* 192.0.2.2/32 (1 entry, 1 announced)
 BGP group r1 type External
     Nexthop: Self
     AS path: [64503] 64502 I
```

*AS path of prefix 192.0.2.2/32 in the BGP UPDATE message sent to R1:*

```
BGP SEND 198.51.100.2+57342 -> 198.51.100.1+179
BGP SEND message type 2 (Update) length 52
BGP SEND Update PDU length 52
BGP SEND flags 0x40 code Origin(1): IGP, length(1)
BGP SEND flags 0x40 code ASPath(2) (4-byte-cap) length 10: 64503 64502
BGP SEND flags 0x40 code NextHop(3): 198.51.100.2 length(4)
End-of-Attributes
BGP SEND         192.0.2.2/32
```

## Example 5: Route propagation from iBGP (R4) to eBGP* (R1)

This example describes the propagation of routes learned via iBGP from R4 to the eBGP peer R1, where R3 applies a local AS alias on its eBGP session with R1. R4 advertises its loopback address 192.0.2.4/32 to R3, which then re-advertises the prefix to R1.

*AS path of prefix 192.0.2.4/32 in the routing table inet.0 on R3:*

```
RE3# run show route 192.0.2.4

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
+ = Active Route, - = Last Active, * = Both

192.0.2.4/32       *[BGP/170] 00:01:10, localpref 100
                      AS path: I, validation-state: unverified
                    >  to 203.0.113.1 via ge-0/0/4.0
```

*AS path of prefix 192.0.2.4/32 in the show route advertising-protocol output on R3:*

```
RE3# run show route advertising-protocol bgp 198.51.100.1 192.0.2.4 detail

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
* 192.0.2.4/32 (1 entry, 1 announced)
 BGP group r1 type External
     Nexthop: Self
     AS path: [64503] I
```

*AS path of prefix 192.0.2.4/32 in the BGP UPDATE message sent to R1:*

```
BGP SEND 198.51.100.2+53299 -> 198.51.100.1+179
BGP SEND message type 2 (Update) length 53
BGP SEND Update PDU length 53
BGP SEND flags 0x40 code Origin(1): IGP, length(1)
BGP SEND flags 0x40 code ASPath(2) (4-byte-cap) length 6: 64503
BGP SEND flags 0x40 code NextHop(3): 198.51.100.2 length(4)
End-of-Attributes
BGP SEND         192.0.2.4/32
```

## Alias local AS Option Behavior for an eBGP Peer - Peering with Global AS

| Route Direction(S -> DUT -> D) | As PathLocal RIB | AS Path(show adv to "D") | UPDATE MESSAGEto "D" | ASPATH_PREPENDby DUT |
|:--|:--|:--|:--|:--|
| R1 -> R3 -> R2 | 64501 I | [64503] 64501 I | 64503 64501 I | Global-as |
| R1 -> R3 -> R4 | 64501 I | [64503] 64501 I | 64501 I |  |
| R3 -> R1 | I | [64503] I | 64503 I | Global-as |
| R2 -> R3 -> R1 | 64502 I | [64503] 64502 I | 64503 64502 I | Global-as |
| R4 -> R3 -> R1 | I | [64503] I | 64503 I | Global-as |

## Configuration: Local AS configured towards iBGP peer (R1) - Peering on Local AS

```
R1                                      R4
[64501]                                 [64503]
(192.0.2.1/32)                          (192.0.2.4/32)
|                                       |
|  eBGP                       iBGP      |
|                              (local-as 65551 alias)
+-------------+           +-------------+
              |           |
              |___    ____|
               ___  R3____
               (192.0.2.3/32)
              |  [64503]  |
              |           |
              |           |
+-------------+           +-------------+
|                                        |
|  eBGP                       iBGP       |
|                                        |
(192.0.2.2/32)                          (192.0.2.5/32)
R2                                      R5
[64502]                                 [64503]
```

The following five example scenarios cover all the cases where local AS alias configuration on an iBGP setup - peering on Local AS impacts the AS path.

## Example 1: Route propagation from iBGP* (R4) to eBGP (R1)

This example describes the propagation of routes learned via iBGP from R4 to the eBGP peer R1, where R3 applies a local AS alias on its iBGP session with R4. R4 advertises its loopback address 192.0.2.4/32 to R3, which then re-advertises the prefix to R1.

*AS path of prefix 192.0.2.4/32 in the routing table inet.0 on R3:*

```
RE3# run show route 192.0.2.4

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
+ = Active Route, - = Last Active, * = Both

192.0.2.4/32       *[BGP/170] 00:02:03, localpref 100
                      AS path: I, validation-state: unverified
                    >  to 203.0.113.1 via ge-0/0/4.0
```

*AS path of prefix 192.0.2.4/32 in the show route advertising-protocol output on R3:*

```
RE3# run show route advertising-protocol bgp 198.51.100.1 192.0.2.4 detail

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
* 192.0.2.4/32 (1 entry, 1 announced)
 BGP group r1 type External
     Nexthop: Self
     AS path: [64503] I
```

*AS path of prefix 192.0.2.4/32 as seen in the BGP UPDATE message sent to R1:*

```
BGP SEND 198.51.100.2+179 -> 198.51.100.1+56356
BGP SEND message type 2 (Update) length 48
BGP SEND Update PDU length 48
BGP SEND flags 0x40 code Origin(1): IGP, length(1)
BGP SEND flags 0x40 code ASPath(2) (4-byte-cap) length 6: 64503
BGP SEND flags 0x40 code NextHop(3): 198.51.100.2 length(4)
End-of-Attributes
BGP SEND         192.0.2.4/32
```

## Example 2: Route propagation from iBGP* (R4) to iBGP (R5)

This example describes the propagation of routes learned via iBGP from R4 to the iBGP peer R5, where R3 applies a local AS alias on its iBGP session with R4. R4 advertises its loopback address 192.0.2.4/32 to R3, which then re-advertises the prefix to R5.

*AS path of prefix 192.0.2.4/32 in the routing table inet.0 on R3:*

```
RE3# run show route 192.0.2.4

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
+ = Active Route, - = Last Active, * = Both

192.0.2.4/32       *[BGP/170] 00:02:03, localpref 100
                      AS path: I, validation-state: unverified
                    >  to 203.0.113.1 via ge-0/0/4.0
```

*AS path of prefix 192.0.2.4/32 in the show route advertising-protocol output on R3:*

```
RE3# run show route advertising-protocol bgp 203.0.113.5 192.0.2.4 detail

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
* 192.0.2.4/32 (1 entry, 1 announced)
 BGP group r5 type Internal
     Nexthop: Self
     Flags: Nexthop Change
     Localpref: 100
     AS path: [64503] I
     Cluster ID: 192.0.2.3
     Originator ID: 192.0.2.4
```

*AS path of prefix as seen in the BGP UPDATE message sent to R5:*

```
BGP SEND 203.0.113.6+179 -> 203.0.113.5+49221
BGP SEND message type 2 (Update) length 63
BGP SEND Update PDU length 63
BGP SEND flags 0x40 code Origin(1): IGP, length(1)
BGP SEND flags 0x40 code ASPath(2) (4-byte-cap) length 0: <null>
BGP SEND flags 0x40 code NextHop(3): 203.0.113.6 length(4)
BGP SEND flags 0x40 code LocalPref(5): 100 length(4)
BGP SEND flags 0x80 code Originator_Id(9) 192.0.2.4 length(4)
BGP SEND flags 0x80 code Cluster_List(10): length(4) 192.0.2.3
End-of-Attributes
BGP SEND         192.0.2.4/32
```

## Example 3: Route propagation from DUT (R3) to iBGP* (R4)

This example examines the AS path of a direct/static route advertised to an iBGP peer. R3 advertises its loopback address 192.0.2.3/32 to R4.

*AS path of prefix 192.0.2.3/32 in the routing table inet.0 on R3:*

```
RE3# run show route 192.0.2.3 detail

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
192.0.2.3/32 (1 entry, 1 announced)
        *Direct Preference: 0
                Next hop type: Interface, Next hop index: 0
                Address: 0x825e414
                Next-hop reference count: 1
                Kernel Table Id: 0
                Next hop: via lo0.0, selected
                State: <Active Int>
                Local AS: 64503
                Age: 10:50
                Validation State: unverified
                Task: IF
                Announcement bits (1): 3-Resolve tree 1
                AS path: I
                Thread: junos-main
```

*AS path of prefix 192.0.2.3/32 in the show route advertising-protocol output on R3:*

```
RE3# run show route advertising-protocol bgp 203.0.113.1 192.0.2.3 detail

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
* 192.0.2.3/32 (1 entry, 1 announced)
 BGP group r4 type Internal
     Nexthop: Self
     Localpref: 100
     AS path: [64503] I
```

*AS path of prefix 192.0.2.3/32 as seen in the BGP UPDATE message sent to R4:*

```
BGP SEND 203.0.113.2+179 -> 203.0.113.1+52654
BGP SEND message type 2 (Update) length 49
BGP SEND Update PDU length 49
BGP SEND flags 0x40 code Origin(1): IGP, length(1)
BGP SEND flags 0x40 code ASPath(2) (4-byte-cap) length 0: <null>
BGP SEND flags 0x40 code NextHop(3): 203.0.113.2 length(4)
BGP SEND flags 0x40 code LocalPref(5): 100 length(4)
End-of-Attributes
BGP SEND         192.0.2.3/32
```

## Example 4: Route propagation from eBGP (R1) to iBGP* (R4)

This example describes the propagation of routes learned via eBGP from R1 to the iBGP peer R4, where R3 applies a local AS alias on its iBGP session with R4. R1 advertises its loopback address 192.0.2.1/32 to R3, which then re-advertises the prefix to R4.

*AS path of prefix 192.0.2.1/32 in the routing table inet.0 on R3:*

```
RE3# run show route 192.0.2.1

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
+ = Active Route, - = Last Active, * = Both

192.0.2.1/32       *[BGP/170] 00:00:42, localpref 100
                      AS path: 64501 I, validation-state: unverified
                    >  to 198.51.100.1 via ge-0/0/0.0
```

*AS path of prefix 192.0.2.1/32 in the show route advertising-protocol output on R3:*

```
RE3# run show route advertising-protocol bgp 203.0.113.1 192.0.2.1 detail

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
* 192.0.2.1/32 (1 entry, 1 announced)
 BGP group r4 type Internal
     Nexthop: Self
     Flags: Nexthop Change
     Localpref: 100
     AS path: [64503] 64501 I
```

*AS path of prefix 192.0.2.1/32 as seen in the BGP UPDATE message sent to R4:*

```
BGP SEND 203.0.113.2+179 -> 203.0.113.1+54998
BGP SEND message type 2 (Update) length 55
BGP SEND Update PDU length 55
BGP SEND flags 0x40 code Origin(1): IGP, length(1)
BGP SEND flags 0x40 code ASPath(2) (4-byte-cap) length 6: 64501
BGP SEND flags 0x40 code NextHop(3): 203.0.113.2 length(4)
BGP SEND flags 0x40 code LocalPref(5): 100 length(4)
End-of-Attributes
BGP SEND         192.0.2.1/32
```

## Example 5: Route propagation from iBGP (R5) to iBGP* (R4)

This example describes the propagation of routes learned via iBGP from R5 to the iBGP peer R4, where R3 applies a local AS alias on its iBGP session with R4. R5 advertises its loopback address 192.0.2.5/32 to R3, which then re-advertises the prefix to R4.

*AS path of prefix 192.0.2.5/32 in the routing table inet.0 on R3:*

```
RE3# run show route 192.0.2.5

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
+ = Active Route, - = Last Active, * = Both

192.0.2.5/32       *[BGP/170] 00:01:38, localpref 100
                      AS path: I, validation-state: unverified
                    >  to 203.0.113.5 via ge-0/0/6.0
```

As path of prefix 192.0.2.5/32 in the show route advertising-protocol output on R3:

```
RE3# run show route advertising-protocol bgp 203.0.113.1 192.0.2.5 detail

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
* 192.0.2.5/32 (1 entry, 1 announced)
 BGP group r4 type Internal
     Nexthop: Self
     Flags: Nexthop Change
     Localpref: 100
     AS path: [64503] I
     Cluster ID: 192.0.2.3
     Originator ID: 192.0.2.5
```

*AS path of prefix 192.0.2.5/32 as seen in the BGP UDPATE message sent to R4:*

```
BGP SEND 203.0.113.2+179 -> 203.0.113.1+53826
BGP SEND message type 2 (Update) length 63
BGP SEND Update PDU length 63
BGP SEND flags 0x40 code Origin(1): IGP, length(1)
BGP SEND flags 0x40 code ASPath(2) (4-byte-cap) length 0: <null>
BGP SEND flags 0x40 code NextHop(3): 203.0.113.2 length(4)
BGP SEND flags 0x40 code LocalPref(5): 100 length(4)
BGP SEND flags 0x80 code Originator_Id(9) 192.0.2.5 length(4)
BGP SEND flags 0x80 code Cluster_List(10): length(4) 192.0.2.3
End-of-Attributes
BGP SEND         192.0.2.5/32
```

## Alias local AS Option Behavior for an iBGP Peer - Peering with Local AS

| Route Direction(S -> DUT -> D) | As PathLocal RIB | AS Path(show adv to "D") | UPDATE MESSAGEto "D" | ASPATH_PREPENDby DUT |
|:--|:--|:--|:--|:--|
| R4 -> R3 -> R1 | I | [64503] I | 64503 I | Global-as |
| R4 -> R3 -> R5 | I | [64503] I | <null> |  |
| R3 -> R4 | I | [64503] I | <null> |  |
| R1 -> R3 -> R4 | 64501 I | [64503] 64501 I | 64501 I |  |
| R5 -> R3 -> R4 | I | [64503] I | <null> |  |

## Configuration: Local AS configured towards iBGP peer (R1) - Peering on Global AS

```
R1                                      R4
[64501]                                 [64503]
(192.0.2.1/32)                          (192.0.2.4/32)
|                                       |
|  eBGP                       iBGP      |
|                              (local-as 65551 alias)
+-------------+           +-------------+
              |           |
              |___    ____|
               ___  R3____
               (192.0.2.3/32)
              |  [64503]  |
              |           |
              |           |
+-------------+           +-------------+
|                                        |
|  eBGP                       iBGP       |
|                                        |
(192.0.2.2/32)                          (192.0.2.5/32)
R2                                      R5
[64502]                                 [64503]
```

The following five example scenarios cover all the cases where local AS alias configuration on an iBGP setup - peering on Global AS impacts the AS path.

## Example 1: Route propagation from iBGP* (R4) to eBGP (R1)

This example describes the propagation of routes learned via iBGP from R4 to the eBGP peer R1, where R3 applies a local AS alias on its iBGP session with R4. R4 advertises its loopback address 192.0.2.4/32 to R3, which then re-advertises the prefix to R1.

*AS path of prefix 192.0.2.4/32 in the routing table inet.0 on R3:*

```
RE3# run show route 192.0.2.4

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
+ = Active Route, - = Last Active, * = Both

192.0.2.4/32       *[BGP/170] 00:00:55, localpref 100
                      AS path: I, validation-state: unverified
                    >  to 203.0.113.1 via ge-0/0/4.0
```

*AS path of prefix 192.0.2.4/32 in the show route advertising-protocol output on R3:*

```
RE3# run show route advertising-protocol bgp 198.51.100.1 192.0.2.4 detail

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
* 192.0.2.4/32 (1 entry, 1 announced)
 BGP group r1 type External
     Nexthop: Self
     AS path: [64503] I
```

*AS path of prefix 192.0.2.4/32 as seen in the BGP UPDATE message sent to R1:*

```
BGP SEND 198.51.100.2+179 -> 198.51.100.1+59818
BGP SEND message type 2 (Update) length 48
BGP SEND Update PDU length 48
BGP SEND flags 0x40 code Origin(1): IGP, length(1)
BGP SEND flags 0x40 code ASPath(2) (4-byte-cap) length 6: 64503
BGP SEND flags 0x40 code NextHop(3): 198.51.100.2 length(4)
End-of-Attributes
BGP SEND         192.0.2.4/32
```

## Example 2: Route propagation from iBGP* (R4) to iBGP (R5)

This example describes the propagation of routes learned via iBGP from R4 to the iBGP peer R5, where R3 applies a local AS alias on its iBGP session with R4. R4 advertises its loopback address 192.0.2.4/32 to R3, which then re-advertises the prefix to R5.

*AS path of prefix 192.0.2.4/32 in the routing table inet.0 on R3:*

```
RE3# run show route 192.0.2.4

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
+ = Active Route, - = Last Active, * = Both

192.0.2.4/32       *[BGP/170] 00:00:55, localpref 100
                      AS path: I, validation-state: unverified
                    >  to 203.0.113.1 via ge-0/0/4.0
```

*AS path of prefix 192.0.2.4/32 in the show route advertising-protocol output on R3:*

```
RE3# run show route advertising-protocol bgp 203.0.113.5 192.0.2.4 detail

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
* 192.0.2.4/32 (1 entry, 1 announced)
 BGP group r5 type Internal
     Nexthop: Self
     Flags: Nexthop Change
     Localpref: 100
     AS path: [64503] I
     Cluster ID: 192.0.2.3
     Originator ID: 192.0.2.4
```

*AS path of prefix as seen in the BGP UPDATE message sent to R5:*

```
BGP SEND 203.0.113.6+179 -> 203.0.113.5+56626
BGP SEND message type 2 (Update) length 63
BGP SEND Update PDU length 63
BGP SEND flags 0x40 code Origin(1): IGP, length(1)
BGP SEND flags 0x40 code ASPath(2) (4-byte-cap) length 0: <null>
BGP SEND flags 0x40 code NextHop(3): 203.0.113.6 length(4)
BGP SEND flags 0x40 code LocalPref(5): 100 length(4)
BGP SEND flags 0x80 code Originator_Id(9) 192.0.2.4 length(4)
BGP SEND flags 0x80 code Cluster_List(10): length(4) 192.0.2.3
End-of-Attributes
BGP SEND         192.0.2.4/32
```

## Example 3: Route propagation from DUT (R3) to iBGP* (R4)

This example examines the AS path of a direct/static route advertised to an iBGP peer. R3 advertises its loopback address 192.0.2.3/32 to R4.

*AS path of prefix 192.0.2.3/32 in the routing table inet.0 on R3:*

```
RE3# run show route 192.0.2.3 detail

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
192.0.2.3/32 (1 entry, 1 announced)
        *Direct Preference: 0
                Next hop type: Interface, Next hop index: 0
                Address: 0x825cf94
                Next-hop reference count: 1
                Kernel Table Id: 0
                Next hop: via lo0.0, selected
                State: <Active Int>
                Local AS: 64503
                Age: 18:36
                Validation State: unverified
                Task: IF
                Announcement bits (1): 3-Resolve tree 1
                AS path: I
                Thread: junos-main
```

*AS path of prefix 192.0.2.3/32 in the show route advertising-protocol output on R3:*

```
RE3# run show route advertising-protocol bgp 203.0.113.1 192.0.2.3 detail

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
* 192.0.2.3/32 (1 entry, 1 announced)
 BGP group r4 type Internal
     Nexthop: Self
     Localpref: 100
     AS path: [64503] I
```

*AS path of prefix 192.0.2.3/32 as seen in the BGP UPDATE message sent to R4:*

```
BGP SEND 203.0.113.2+179 -> 203.0.113.1+57761
BGP SEND message type 2 (Update) length 49
BGP SEND Update PDU length 49
BGP SEND flags 0x40 code Origin(1): IGP, length(1)
BGP SEND flags 0x40 code ASPath(2) (4-byte-cap) length 0: <null>
BGP SEND flags 0x40 code NextHop(3): 203.0.113.2 length(4)
BGP SEND flags 0x40 code LocalPref(5): 100 length(4)
End-of-Attributes
BGP SEND         192.0.2.3/32
```

## Example 4: Route propagation from eBGP (R1) to iBGP* (R4)

This example describes the propagation of routes learned via eBGP from R1 to the iBGP peer R4, where R3 applies a local AS alias on its iBGP session with R4. R1 advertises its loopback address 192.0.2.1/32 to R3, which then re-advertises the prefix to R4.

*AS path of prefix 192.0.2.1/32 in the routing table inet.0 on R3:*

```
RE3# run show route 192.0.2.1

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
+ = Active Route, - = Last Active, * = Both

192.0.2.1/32       *[BGP/170] 00:00:51, localpref 100
                      AS path: 64501 I, validation-state: unverified
                    >  to 198.51.100.1 via ge-0/0/0.0
```

*AS path of prefix 192.0.2.1/32 in the show route advertising-protocol output on R3:*

```
RE3# run show route advertising-protocol bgp 203.0.113.1 192.0.2.1 detail

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
* 192.0.2.1/32 (1 entry, 1 announced)
 BGP group r4 type Internal
     Nexthop: Self
     Flags: Nexthop Change
     Localpref: 100
     AS path: [64503] 64501 I
```

*AS path of prefix 192.0.2.1/32 as seen in the BGP UPDATE message sent to R4:*

```
BGP SEND 203.0.113.2+179 -> 203.0.113.1+58428
BGP SEND message type 2 (Update) length 55
BGP SEND Update PDU length 55
BGP SEND flags 0x40 code Origin(1): IGP, length(1)
BGP SEND flags 0x40 code ASPath(2) (4-byte-cap) length 6: 64501
BGP SEND flags 0x40 code NextHop(3): 203.0.113.2 length(4)
BGP SEND flags 0x40 code LocalPref(5): 100 length(4)
End-of-Attributes
BGP SEND         192.0.2.1/32
```

## Example 5: Route propagation from iBGP (R5) to iBGP* (R4)

This example describes the propagation of routes learned via iBGP from R5 to the iBGP peer R4, where R3 applies a local AS alias on its iBGP session with R4. R5 advertises its loopback address 192.0.2.5/32 to R3, which then re-advertises the prefix to R4.

*AS path of prefix 192.0.2.5/32 in the routing table inet.0 on R3:*

```
RE3# run show route 192.0.2.5

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
+ = Active Route, - = Last Active, * = Both

192.0.2.5/32       *[BGP/170] 00:01:03, localpref 100
                      AS path: I, validation-state: unverified
                    >  to 203.0.113.5 via ge-0/0/6.0
```

*As path of prefix 192.0.2.5/32 in the show route advertising-protocol output on R3:*

```
RE3# run show route advertising-protocol bgp 203.0.113.1 192.0.2.5 detail

inet.0: 20 destinations, 20 routes (20 active, 0 holddown, 0 hidden)
* 192.0.2.5/32 (1 entry, 1 announced)
 BGP group r4 type Internal
     Nexthop: Self
     Flags: Nexthop Change
     Localpref: 100
     AS path: [64503] I
     Cluster ID: 192.0.2.3
     Originator ID: 192.0.2.5
```

*AS path of prefix 192.0.2.5/32 as seen in the BGP UDPATE message sent to R4:*

```
BGP SEND 203.0.113.2+179 -> 203.0.113.1+60079
BGP SEND message type 2 (Update) length 63
BGP SEND Update PDU length 63
BGP SEND flags 0x40 code Origin(1): IGP, length(1)
BGP SEND flags 0x40 code ASPath(2) (4-byte-cap) length 0: <null>
BGP SEND flags 0x40 code NextHop(3): 203.0.113.2 length(4)
BGP SEND flags 0x40 code LocalPref(5): 100 length(4)
BGP SEND flags 0x80 code Originator_Id(9) 192.0.2.5 length(4)
BGP SEND flags 0x80 code Cluster_List(10): length(4) 192.0.2.3
End-of-Attributes
BGP SEND         192.0.2.5/32
```

## Alias Local AS Option Behavior for an iBGP Peer - Peering with Global AS

| Route Direction(S -> DUT -> D) | As PathLocal RIB | AS Path(show adv to "D") | UPDATE MESSAGEto "D" | ASPATH_PREPENDby DUT |
|:--|:--|:--|:--|:--|
| R4 -> R3 -> R1 | I | [64503] I | 64503 I | Global-as |
| R4 -> R3 -> R5 | I | [64503] I | <null> |  |
| R3 -> R4 | I | [64503] I | <null> |  |
| R1 -> R3 -> R4 | 64501 I | [64503] 64501 I | 64501 I |  |
| R5 -> R3 -> R4 | I | [64503] I | <null> |  |

## Conclusion

This article covered the details of **Alias Local AS option**, please check the articles in the section below for the other options.

## Useful links

Local-AS options articles:

- [Default](https://juniper.github.io/techposts/mastering-local-as-alias-mode/article)
- [Alias](https://juniper.github.io/techposts/mastering-local-as-alias-mode/article)
- [Private](https://juniper.github.io/techposts/mastering-local-as-private-mode/article)
- [No-Prepend-Global-AS](https://juniper.github.io/techposts/mastering-local-as-no-prepend-global-as/article)
- [Private No-Prepend-Global-AS](https://juniper.github.io/techposts/mastering-local-as-private-no-prepend-global-as/article)

## Glossary

- AS(N): Autonomous System (Number)
- BGP: Border Gateway Protocol
- DUT: Device Under Test
- ISP: Internet Service Provider
- RIB: Routing Information Base

## Comments

If you want to reach out for comments, feedback or questions, drop us an email at:
