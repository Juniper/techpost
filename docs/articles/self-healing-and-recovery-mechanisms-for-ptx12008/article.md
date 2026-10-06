# Self Healing and Recovery Mechanisms For PTX12008

**Abhishek A Jain - 04/25/2026**

Modern core networks are expected to operate nonstop, even when components fail. In high-capacity chassis, fabric resiliency is fundamental requirement. This blog will describe in details the self-healing and recovery mechanisms built into the PTX12008 switching fabric. We'll explore how the system detects faults, correlates failures, and automatically recovers from them... Ideally, before traffic is impacted.

This article is the third of a series on PTX12000 fabric, we invite the readers to check the two previous posts:

- [Rethinking Fabric Redundancy](https://juniper.github.io/techposts/rethinking-fabric-redundancy/article) by Dmitry Shokarev
- [PTX12008 Fabric Topology](https://juniper.github.io/techposts/ptx12008-fabric-topology/article) by Rahul Kulkarni

## Introduction: Why Fabric Resiliency Matters

[PTX12008 (PTX12k) is an eight-slot linecards chassis](https://juniper.github.io/techposts/introducing-ptx12000-chassis/article) paired with nine Switch Interface Boards (SIBs), designed to deliver massive, non-blocking throughput: 345.6Tbps.

Each line card leverages three BX+BF (BXF) chipsets for packet processing and cross-fabric switching, and offers 54x 800G client ports (QSFP or OSFP).

Each SIB uses 432x links to connect to all Line Card (LC). So, on a fully loaded system with 9x SIBs and 8x LC, a total of 3,888 bi-directional links are managed.

In the PTX12008 Fabric board, the links between the terminal endpoints (BXF chipset in LC and BF chipset in SIB) are designed short in length and contain few, or no, active components in order to avoid any transmission errors and to optimize Signal to Noise (S/N) ratio.

The software continuously monitors the health of every link, removes a link from service if errors are detected, and attempts to restore normal operation if needed.

Starting with Express 5, we introduce the support of fabric cell retransmission, a concept which is similar in principle to the Link Level Retry defined by the Ultra Ethernet Consortium.

With high bandwidth systems, no transmission medium can be completely error-free. Some level of data corruption is expected  and retransmissions are necessary. The key is to manage it effectively.

In modern day networks and at the scale that they operate, failures are inevitable: links can flap, ASICs may misbehave, and fabric paths can degrade. What matters is how quickly the system recovers and if the recovery is automatic...  That's where fabric resiliency comes into picture.

## The Pillars of Fabric Resiliency

At a high level, PTX12008 follows a structured recovery philosophy:

- **Detect**: Identify hardware or software faults
- **Log**: Report issues with actionable telemetry
- **Correlate**: Isolate the fault locally when possible
- **Recover**: Attempt automated self healing
- **Debug**: Escalate for RMA if recovery fails

The above principles power three key mechanisms:

- **Link Auto Heal (LAH)**
- **Fabric Hardening**
- **Fabric Degradation Handling**

Let's look at each mechanism in detail.

## Link Auto Heal (LAH)

Or how to fix faulty fabric links automatically... Fabric links connect FPCs (line cards) and SIBs. If one of these links goes bad, traffic could be impacted, unless the system acts fast.

Link Auto Heal is a process by which the software monitors the state of each link and, if found faulty, it attempts to recover by itself.

## What LAH Does?

Link Auto Heal automatically:

- Detects fabric link faults
- Tears down the affected link (traffic is no longer using this link)
- Retrains the link between FPC and SIB
- Verifies recovery and restores traffic

This entire process happens **without operator intervention**.

*Note: **Retraining** of fabric links refers to the process by which a communication link within a network fabric automatically **re-negotiates and re-establishes its operating parameters** after a disruption or change in conditions.*

## When Is LAH Triggered?

LAH kicks in when fabric link faults occur due to issues such as:

- Elevated bit error rates or CRC errors
- Poor signal integrity or noise conditions
- Hardware level anomalies
- Invalid or unstable link coefficients

The process comes with built-in safeguards:

- Each link gets up to 3 auto-heal attempts within 24 hours
- If healing fails repeatedly, the link is marked permanently faulty
- Recovery then requires a SIB restart

This prevents endless retries and ensures system stability.

### Output Captures

Fabric summary and Fabric topology command on the router clearly reflects the faulted state of a link:

```
regress@ptx12008-re0# run show chassis fabric topology  
 <Snippet>
SIB 0 FCHIP 0 FCORE 0 :
-----------------------
          In-links               State             Out-links              State
--------------------------------------------------------------------------------
FPC00FE0(8,00)->SIB00F0(3,06)    UP      SIB00F0(3,06)->FPC00FE0(8,00)    FAULT
FPC00FE0(7,06)->SIB00F0(3,00)    UP      SIB00F0(3,00)->FPC00FE0(7,06)    UP   
FPC00FE0(7,03)->SIB00F0(3,01)    UP      SIB00F0(3,01)->FPC00FE0(7,03)    UP   
FPC00FE1(1,06)->SIB00F0(3,05)    UP      SIB00F0(3,05)->FPC00FE1(1,06)    UP   
FPC00FE1(3,00)->SIB00F0(2,07)    UP      SIB00F0(2,07)->FPC00FE1(3,00)    UP   

{master}[edit]
regress@ptx12008-re0# run show chassis fabric summary 
Plane   State      Link   Link  Reachability errors  Uptime
                   Error  TF    Local / Remote
 0      Online     YES    NO     NO   / NO          7 hours, 13 minutes, 16 seconds
 1      Online     NO     NO     NO   / NO          7 hours, 13 minutes, 16 seconds
 2      Online     NO     NO     NO   / NO          7 hours, 13 minutes, 16 seconds

{master}[edit]
regress@ptx12008-re0# run show chassis fabric summary 
Plane   State      Link   Link  Reachability errors  Uptime
                   Error  TF    Local / Remote
 0      Online     YES    NO     NO   / NO          7 hours, 13 minutes, 16 seconds
 1      Online     NO     NO     NO   / NO          7 hours, 13 minutes, 16 seconds
 2      Online     NO     NO     NO   / NO          7 hours, 13 minutes, 16 seconds
```

Once the link transitions to FAULT, LAH is automatically triggered and can be inspected using the following command.

```
{master}[edit]
regress@PTX12008>show chassis fabric errors autoheal 
2026-02-23 08:22:02 PST   /Fpc[0]/Pfe[0]/Plane[0] Requested
2026-02-23 08:22:47 PST   /Fpc[0]/Pfe[0]/Plane[0] Success   
```

LAH consists of two stages:

- **Requested**: Retraining initiated
- **Success**: Link recovered

As mentioned earlier, each link is allowed **3 auto-heal attempts within 24 hours and the 4th Error is reported as Denied**.

```
regress@ptx12008-re0# run show chassis fabric errors autoheal 
2026-02-23 08:43:56 PST   /Fpc[0]/Pfe[0]/Plane[0] Requested
2026-02-23 08:44:41 PST   /Fpc[0]/Pfe[0]/Plane[0] Success
2026-02-23 08:45:13 PST   /Fpc[0]/Pfe[0]/Plane[0] Requested
2026-02-23 08:46:00 PST   /Fpc[0]/Pfe[0]/Plane[0] Success
2026-02-23 08:46:27 PST   /Fpc[0]/Pfe[0]/Plane[0] Requested
2026-02-23 08:47:12 PST   /Fpc[0]/Pfe[0]/Plane[0] Success
2026-02-23 08:47:28 PST   /Fpc[0]/Pfe[0]/Plane[0] Denied - Exceeded Max Attempts
```

## Recovering from Fabric Blackholing

Sometimes, the problem isn't just one link: it's far worse. While LAH addresses individual link issues, broader fabric failures may still occur.

## What Is Fabric Blackholing?

At a high level, network traffic enters the system through the incoming WAN ports. The device then consults the control plane to figure out which outgoing WAN port should be used to reach the destination. Once this information is known, the data plane forwards the traffic through the fabric planes, which internally connect the source PFE (Packet Forwarding Engine) to the destination PFE.

What if the path between the source and destination PFE is broken? This is where blackhole of traffic occurs.

A blackhole occurs when: a Packet Forwarding Engine (PFE) has interfaces UP, but no usable fabric planes are available, resulting in traffic silently dropping. If all PFEs are affected, the entire router is effectively blackholed.

## Fabric Hardening to the Rescue

Fabric Hardening continuously monitors the state of the fabric health both at the ASIC and the board level. When severe degradation or blackholing is detected, the system automatically launches multi phase recovery actions.

This multi-phase recovery action is called as the "Fabric Hardening Phase" action or simply FHP process. FHP process consists of 3 phases.

- Phase 1: the SIB restart.
- Phase 2: the FPC/PFE restart.
- Phase 3: isthe FPC/PFE offline.

It may sound a complex process, but the good news is none of these phases are something an end-user manually triggers or needs to know about. They happen **automatically** and the system hides all the complexity. Just like LAH, FHP is a self-healing or a self-recovery process.

Once the system learns about a degradation, it is intelligent enough to automatically trigger the required phase action and recover itself from the degradation that has been detected. As a End user, one can stop here and trust the PTX12008 to be smart enough to handle the faults on its own whether it is at link-level or SIB/Board-level. However If you'd like to look under the hood, then go ahead and read on.

## The 3-Phase Fabric Recovery Model

PTX12008 uses an escalating recovery strategy, starting with minimal impact and increasing only if needed.

Before getting into the details of the FHP process, let's briefly describe the types of faults that trigger FHP.

## Types of Reachability Faults

They can be categorized into 2 types:

### Self Reachability Faults

They are raised when a PFE loses reachability across all fabric planes.

Example:

- PFE A observes faults on all planes 0--26 and has no link to send out the traffic.

### Peer Reachability Faults

They are raised when two PFEs have zero mutual reachability, even if each has partial fabric access.

Example:

- PFE A faults on planes 0--12
- PFE B faults on planes 13--26

Result: Peer reachability fault between A and B.

## Workflow of FHP Process

**Phase 1: Restart SIBs or Switch ASICs**

- Used when failures span multiple FPCs. i.e when multiple FPCs report error towards single/multiple/all planes.
- SIBs are restarted one by one
- Targets fabric wide issues first

Goal: Restore fabric health with minimal disruption

```
{master}[edit]
regress@ptx12008-re0# run show chassis fabric reachability detail 

Fabric reachability status: Fabric degradation detected, action in progress
        Detected on                         : 2026-03-11 09:12:41 PDT
        Reason                              : Fabric Degradation due to Plane faults

Fabric reachability action:
    Fabric reachability action              : SIB action
    Current phase                           : In progress
    Action started                          : 2026-03-11 09:12:41 PDT
        SIB restart phase                   : In progress
            Phase started                   : 2026-03-11 09:12:41 PDT
            SIBs being offlined         : 1 : 2026-03-11 09:12:52 PDT

{master}[edit]
regress@ptx12008-re0# run show chassis fabric reachability detail    

Fabric reachability status: Fabric degradation detected, action in progress
        Detected on                         : 2026-03-11 09:12:41 PDT
        Reason                              : Fabric Degradation due to Plane faults

Fabric reachability action:
    Fabric reachability action              : SIB action
    Current phase                           : Completed
    Action started                          : 2026-03-11 09:12:41 PDT
        SIB restart phase                   : Completed
            Phase started                   : 2026-03-11 09:12:41 PDT
                SIBs restarted              : 1 
            Phase completed                 : 2026-03-11 09:17:34 PDT
```

**Phase 2: Restart PFEs or Entire FPCs**

- Used when faults are isolated to specific line cards or PFEs
- Individual PFEs are restarted if only a single/multiple (but not all) PFE is reporting error.
- Entire FPC restart if all PFEs are affected

Goal: Recover faulty forwarding engines

```
{master}[edit]
regress@ptx12008-re0# run show chassis fabric summary 
Plane   State      Link   Link  Reachability errors  Uptime
                   Error  TF    Local / Remote
 0      Online     YES    NO     NO   / NO          3 hours, 39 minutes, 28 seconds
 1      Online     YES    NO     NO   / NO          3 hours, 39 minutes, 28 seconds
 2      Online     YES    NO     NO   / NO          3 hours, 39 minutes, 28 seconds
 3      Online     YES    NO     NO   / NO          3 hours, 40 minutes, 18 seconds
 4      Online     YES    NO     NO   / NO          3 hours, 40 minutes, 18 seconds
 5      Online     YES    NO     NO   / NO          3 hours, 40 minutes, 18 seconds
 6      Online     YES    NO     NO   / NO          3 hours, 39 minutes, 32 seconds
 7      Online     YES    NO     NO   / NO          3 hours, 39 minutes, 32 seconds
 8      Online     YES    NO     NO   / NO          3 hours, 39 minutes, 32 seconds
 9      Online     YES    NO     NO   / NO          3 hours, 41 minutes
 10     Online     YES    NO     NO   / NO          3 hours, 41 minutes
 11     Online     YES    NO     NO   / NO          3 hours, 41 minutes
 12     Online     YES    NO     NO   / NO          3 hours, 39 minutes, 29 seconds
 13     Online     YES    NO     NO   / NO          3 hours, 39 minutes, 29 seconds
 14     Online     YES    NO     NO   / NO          3 hours, 39 minutes, 29 seconds
 15     Online     YES    NO     NO   / NO          3 hours, 39 minutes, 33 seconds
 16     Online     YES    NO     NO   / NO          3 hours, 39 minutes, 33 seconds
 17     Online     YES    NO     NO   / NO          3 hours, 39 minutes, 33 seconds
 18     Online     YES    NO     NO   / NO          3 hours, 40 minutes, 17 seconds
 19     Online     YES    NO     NO   / NO          3 hours, 40 minutes, 17 seconds
 20     Online     YES    NO     NO   / NO          3 hours, 40 minutes, 17 seconds
 21     Online     YES    NO     NO   / NO          3 hours, 39 minutes, 34 seconds
 22     Online     YES    NO     NO   / NO          3 hours, 39 minutes, 34 seconds
 23     Online     YES    NO     NO   / NO          3 hours, 39 minutes, 34 seconds
 24     Online     YES    NO     NO   / NO          3 hours, 41 minutes, 1 second
 25     Online     YES    NO     NO   / NO          3 hours, 41 minutes, 1 second
 26     Online     YES    NO     NO   / NO          3 hours, 41 minutes, 1 second

{master}[edit]
regress@ptx12008-re0# run show chassis fabric reachability 

Fabric reachability status: Fabric degradation detected, action in progress
        Detected on                         : 2026-02-26 08:23:23 PST
        Reason                              : Fabric Degradation due to FPC/PFE faults

Fabric reachability action:
    Fabric reachability action              : PFE Restart action
    Current phase                           : In progress
    Action started                          : 2026-02-26 08:23:23 PST
regress@ptx12008-re0# run show chassis fpc pfe-instance all 

FPC 0
PFE-Instance    PFE          PFE-State
0               0            ONLINE               
0               1            ONLINE               
1               2            ONLINE               
1               3            ONLINE               
2               4            ONLINE               
2               5            ONLINE               


FPC 2
PFE-Instance    PFE          PFE-State
0               0            TRANSITION_OFFLINE   
0               1            TRANSITION_OFFLINE   
1               2            ONLINE               
1               3            ONLINE               
2               4            ONLINE               
2               5            ONLINE               

{master}[edit]
regress@ptx12008-re0# run show chassis fabric reachability     

Fabric reachability status: Fabric degradation detected, action in progress
        Detected on                         : 2026-02-26 08:23:23 PST
        Reason                              : Fabric Degradation due to FPC/PFE faults

Fabric reachability action:
    Fabric reachability action              : PFE Restart action
    Current phase                           : In progress
    Action started                          : 2026-02-26 08:23:23 PST

{master}[edit]
regress@ptx12008-re0# run show chassis fabric reachability    

Fabric reachability status: Fabric degradation detected, action in progress
        Detected on                         : 2026-02-26 08:23:23 PST
        Reason                              : Fabric Degradation due to FPC/PFE faults

Fabric reachability action:
    Fabric reachability action              : PFE Restart action
    Current phase                           : Completed
    Action started                          : 2026-02-26 08:23:23 PST

{master}[edit]
regress@ptx12008-re0# run show chassis fabric reachability detail 

Fabric reachability status: Fabric degradation detected, action in progress
        Detected on                         : 2026-02-26 08:23:23 PST
        Reason                              : Fabric Degradation due to FPC/PFE faults

Fabric reachability action:
    Fabric reachability action              : PFE Restart action
    Current phase                           : Completed
    Action started                          : 2026-02-26 08:23:23 PST
        PFE restart phase                   : Completed
            Phase started                   : 2026-02-26 08:23:24 PST
                PFEs restarted              : 2/0 
            Phase completed                 : 2026-02-26 08:26:46 PST
```

**Phase 3: Isolate the Fault (Last Resort)**

- Triggered only if Phase 1 and 2 fail
- Affected PFEs/FPCs are:
    - Taken offline, or
    - Interfaces (IFDs) are disabled

Goal: Stop blackholing and protect the rest of the system.

Alarms are raised so operators know exactly which components failed and why.

```
{master}[edit]
regress@octomore-p2a-blr-a-re0# run show chassis fabric reachability 
Mar 17 13:17:05

Fabric reachability status: Unreachable destinations removed
        Detected on                         : 2026-03-17 12:12:21 +06

Fabric reachability action:
    Fabric reachability action              : PFE action
    Current phase                           : Completed
    Action started                          : 2026-03-17 12:12:21 +06
    Action completed                        : 2026-03-17 12:12:32 +06

{master}[edit]
regress@octomore-p2a-blr-a-re0# run show chassis fabric reachability detail 
Mar 17 13:17:06

Fabric reachability status: Unreachable destinations removed
        Detected on                         : 2026-03-17 12:12:21 +06

Fabric reachability action:
    Fabric reachability action              : PFE action
    Current phase                           : Completed
    Action started                          : 2026-03-17 12:12:21 +06
    Action completed                        : 2026-03-17 12:12:32 +06
        PFE offline/IFD disable phase       : Completed
            Phase started                   : 2026-03-17 12:12:21 +06
                FPC/PFE slots               : 0/0, 0/1, 0/2, 0/3, 0/4, 0/5, 1/0, 1/1, 1/2, 1/3, 1/4, 1/5, 2/0, 2/1, 2/2, 2/3, 2/4, 2/5, 3/0, 3/1, 3/2, 3/3, 3/4, 3/5, 4/0, 4/1, 4/2, 4/3, 4/4, 4/5, 5/0, 5/1, 5/2, 5/3, 5/4, 5/5 
            Phase completed                 : 2026-03-17 12:12:32 +06

Fabric reachability resolution: Unreachable destinations removed after IFD disable phase
```

## Fabric Degradation: Action Before Things Get Worse

Waiting for a complete blackhole is certainly not ideal. What can we do in anticipation?

## What Is Fabric Degradation?

Fabric Degradation is a partial loss of fabric reachability, where only some planes are impacted. Operators can configure thresholds such as:

```
set chassis fabric event reachability-fault degraded error-threshold degradation <percentage>
```

If degradation crosses this threshold:

- It is treated like a blackhole
- The same 3-phase recovery model described above is triggered

This allows **proactive healing** before traffic is fully impacted.

## Recovery Flow

Here's how the system decides what to do:

- **Faults at link level** -> Link Auto Heal (LAH)
- **Multiple FPCs affected**, **multiple planes degraded** or **multiple SIB impacted**

-> Phase 1
-> Phase 2
-> Phase 3 (if required), in general called the Fabric Hardening.

At every step, recovery actions are:

- Logged
- Correlated
- Rate limited
- Fully observable via CLI

## Conclusion

With **Link** **Auto Heal**, **Fabric Hardening**, and **Fabric Degradation** handling, PTX12008 delivers a robust self-healing fabric architecture that:

- Minimizes traffic blackholing
- Reduces manual intervention
- Provides clear fault visibility
- Escalates safely when automation can't recover

The system aggressively attempts self-recovery before escalating to isolation or operator action. When recovery is not possible, the system provides precise fault localization, enabling faster root cause analysis and corrective action.

In short, the system doesn't just fail, it fights to heal itself first.

If resiliency is a requirement (and in modern core networks, it always is), PTX12008 sets the bar high.

## Useful links

- Introducing the PTX12000 Chassis: [https://juniper.github.io/techposts/introducing-ptx12000-chassis/article](https://juniper.github.io/techposts/introducing-ptx12000-chassis/article)
- Rethinking Fabric Redundancy: [https://juniper.github.io/techposts/rethinking-fabric-redundancy/article](https://juniper.github.io/techposts/rethinking-fabric-redundancy/article)
- PTX12008 Fabric Topology: [https://juniper.github.io/techposts/ptx12008-fabric-topology/article](https://juniper.github.io/techposts/ptx12008-fabric-topology/article)

## Glossary

- ASIC: Application-Specific Integrated Circuit
- BF: Buffer Fabric (Juniper-specific chipset name; BF is the fabric chip in the BXF/BF pair)
- BXF: Broadband eXtensible Fabric (Juniper-specific chipset family used for packet processing and cross-fabric switching)
- CLI: Command-Line Interface
- CRC: Cyclic Redundancy Check
- FCHIP: Fabric Chip
- FCORE: Fabric Core
- FHP: Fabric Hardening Phase
- FPC: Flexible PIC Concentrator (linecard in Juniper routers)
- IFD: Physical Interface Structure
- LAH: Link Auto Heal
- LC: Line Card
- PFE: Packet Forwarding Engine
- PIC: Physical Interface Card
- PST: Pacific Standard Time
- RMA: Return Merchandise Authorization
- SIB: Switch Interface Board
- S/N: Signal-to-Noise (ratio)
- WAN: Wide Area Network
