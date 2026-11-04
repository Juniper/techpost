# 802.1X Integration Guide

**Daniel McNulty - 2026-11-02**

Aruba ClearPass Policy Manager with HPE Networking Mist Wi-Fi, EX Switching, and SRX: Step-by-step build guide, manual GUI and CLI procedures

## Scope and prerequisites - Step 1

**What this guide covers**

Building 802.1X authentication against ClearPass for:

- HPE Networking Mist wireless, using PEAP-MSCHAPv2 with a private certificate authority
- HPE Networking EX wired switching, same authentication source
- HPE Networking SRX, consuming ClearPass identity for user-aware firewall policy

It also covers building the private CA, installing the server certificate on ClearPass, and distributing the root certificate to Windows and macOS clients.
This covers the very basics of 802.1X auth. We are using the OS supplicants, we are not doing any posture checking or any other advanced features. Perhaps in a future update.

### What is assumed

- ClearPass Policy Manager is installed, licensed, and reachable from the network devices.
- A Mist organization exists, access points are adopted and showing as connected.
- The EX and SRX are in service and manageable.

### Reference addressing

Substitute your own values throughout. The reference lab used:

Table: Reference addressing

| Role | Address / value |
|---|---|
| ClearPass management interface | `10.0.3.210` |
| ClearPass FQDN | `clearpass.example.org` |
| EX switch | `10.0.3.244` |
| SRX firewall | `10.0.3.254` |
| Mist AP 1 | `10.0.0.250` |
| Mist AP 2 | `10.0.0.242` |
| Mist AP 3 | `10.0.0.180` |
| Client VLAN | `100` (trust) |
| Test SSID | `lab-dot1x` |

> Note: One of ClearPass's many oddities is it requires exactly two interfaces: a management port and a data port. These interfaces must be on different LANs. Each interface must be configured. In my case I set the data port to a bogus LAN. However, all AAA services listen on both interfaces. RADIUS does not require the data port and I don't know what purpose it serves. Point your network devices at whichever ClearPass address they can reach directly, for me the management interface.

## Build the private certificate authority - Step 2

### Create the OpenSSL configuration files - Step 2.1

If you already have a CA and installed the CA cert onto your endpoints you can skip sections 2.1 and 2.2. Use a machine with OpenSSL 3.x. MacOS, Linux, WSL-on-Windows for instance. 

Create two files:

- **File: openssl-ca.cnf**

```
[req]
distinguished_name = dn
prompt = no
x509_extensions = v3_ca

[dn]
C  = US
O  = Example Lab
CN = Example Lab Root CA

[v3_ca]
basicConstraints     = critical, CA:TRUE, pathlen:0
keyUsage             = critical, keyCertSign, cRLSign
subjectKeyIdentifier = hash
```

- **File: openssl-server.cnf**

```
[req]
distinguished_name = dn
prompt = no
req_extensions = v3_req

[dn]
C  = US
O  = Example Lab
CN = clearpass.example.org

[v3_req]
basicConstraints = CA:FALSE
keyUsage         = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName   = @alt

[alt]
DNS.1 = clearpass.example.org
DNS.2 = clearpass
IP.1  = 10.0.3.210
```

### Generate the root CA - Step 2.2

```
openssl genrsa -out ca-key.pem 4096

openssl req -x509 -new -key ca-key.pem -sha256 -days 3650 \
  -config openssl-ca.cnf -out ca-cert.pem

chmod 600 ca-key.pem
cp ca-cert.pem Example-Lab-Root-CA.crt
```

Windows and macOS both expect the .crt extension when you double-click a certificate to import it.

### Generate and sign the server certificate  - Step 2.3

```
openssl genrsa -out clearpass-key.pem 2048

openssl req -new -key clearpass-key.pem \
  -config openssl-server.cnf -out clearpass.csr

openssl x509 -req -in clearpass.csr \
  -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial \
  -out clearpass-cert.pem -days 730 -sha256 \
  -extfile openssl-server.cnf -extensions v3_req

chmod 600 clearpass-key.pem
rm -f clearpass.csr ca-cert.srl
```

> Note: OpenSSL 3 automatically adds a Subject Key Identifier and an Authority Key Identifier, and the AKI will match the CA Subject Key Identifier. ClearPass requires this linkage. On older OpenSSL versions you may need to add them to the extension block explicitly.

### Produce a passphrase-protected bundle - Step 2.4

ClearPass will not import a private key that has no passphrase. The field is mandatory even though nothing forces the key to be encrypted in the first place. Produce a PKCS#12 full-chain with a passphrase which ClearPass accepts.

```
openssl pkcs12 -export \
  -inkey clearpass-key.pem \
  -in clearpass-cert.pem \
  -certfile ca-cert.pem \
  -name clearpass-radius \
  -out clearpass-radius.p12 \
  -passout pass:CHOOSE_A_PASSPHRASE

chmod 600 clearpass-radius.p12
```

### Verification - Step 2.5

```
openssl verify -CAfile ca-cert.pem clearpass-cert.pem

openssl x509 -in clearpass-cert.pem -noout -subject -issuer -dates \
  -ext subjectAltName,extendedKeyUsage
```

**Expected output:**

```plaintext
clearpass-cert.pem: OK

subject=C=US, O=Example Lab, CN=clearpass.example.org
issuer=C=US, O=Example Lab, CN=Example Lab Root CA
notBefore=...  notAfter=... (two years out)
X509v3 Subject Alternative Name:
    DNS:clearpass.example.org, DNS:clearpass, IP Address:10.0.3.210
X509v3 Extended Key Usage:
    TLS Web Server Authentication
```

If Subject Alternative Name or Extended Key Usage are missing, go back to previous step.

## Install the certificate on ClearPass - Step 3

ClearPass refuses to accept a server certificate whose issuer it does not already trust, so the root CA must go in first.

### Add the root CA to the Certificate Trust List - Step 3.1

1. In the ClearPass admin UI, go to Administration > Certificates > Trust List.
2. Click Add.
3. Upload ca-cert.pem (or Example-Lab-Root-CA.crt, the same file).
4. Set Usage. Tick "EAP." Tick "Others" as well, which is what the built-in entries use.
5. Ensure the entry is Enabled.
6. Save.

Confirm the new entry appears in the Trust List showing your root CA subject, with Enabled set to true and EAP among its usages.

### Import the server certificate - Step 3.2

1. Go to Administration > Certificates > Certificate Store.
2. Confirm the Server Certificates tab is selected.
3. In Select Usage, choose RADIUS/EAP Server Certificate. Note what is currently installed, which on a fresh system should be a self-signed certificate issued by the appliance to itself.
4. Click Import Certificate, top right.
5. Certificate Type: Server Certificate.
6. Server IP: your ClearPass node.
7. Usage: RADIUS/EAP Server Certificate.
8. Upload Method: Upload PKCS#12 Certificate (.pfx or .p12 only).
9. Choose the clearpass-radius.p12 file built in step 2.5.
10. Enter the passphrase you set.
11. Click Import.

Verify by returning to "Certificate Store" with "Usage" set to "RADIUS/EAP Server Certificate." "Subject" should now be your server certificate common name and Issued by should be your root CA. "Validity Status" should read "Valid" and "Certificate Enabled" should be "Yes."

### Restart the RADIUS service - Step 3.3

1. Go to Administration > Server Manager > Server Configuration.
2. Click your ClearPass node in the list.
3. Open the Services Control tab.
4. Find Radius server in the list.
5. Click Stop. Wait until the row reports the service as stopped.
6. Click Start. Wait until it reports Running again.

### Confirm RADIUS is processing - Step 3.4

Generate any authentication attempt, then go to Monitoring > Live Monitoring > Access Tracker. A new row should appear indicating the authentication result. Note that *any* result indicates RADIUS is working, but no result indicates RADIUS is either not working or the NAD's request never made it to RADIUS.

## Distribute the root CA to client endpoints - Step 4

Clients must hold your root CA before they can validate the ClearPass server certificate. Distribute ca-cert.pem, renamed to a .crt extension. This file contains only the public certificate. It is not sensitive and can be emailed or hosted internally.

### Windows - Step 4.1

Install into the "Local Computer" store, not the current user store. 802.1X for a wired or wireless network interface is evaluated in a machine context, and a certificate installed only for the logged-in user will not work reliably.

1. Press Win+R, type mmc, press Enter.
2. File > Add/Remove Snap-in.
3. Select Certificates, click Add.
4. Choose "Computer account," then Next
5. Choose "Local computer," then Finish, then OK.
6. Expand "Certificates (Local Computer)" > "Trusted Root Certification Authorities."
7. Right-click "Certificates" under that node, then "All Tasks > Import" then "Next."
8. Browse to "Example-Lab-Root-CA.crt." then "Next."
9. Confirm the store is "Trusted Root Certification Authorities." "Next" then "Finish."

**Verify**: the certificate appears in that store with your CA common name, and opening it shows "This certificate is OK" rather than a trust error.
Command line alternative, from an elevated prompt: 

```plaintext
certutil -addstore -f Root Example-Lab-Root-CA.crt
```

Of course at scale you would use something like: Group Policy: Computer Configuration > Policies > Windows Settings > Security Settings > Public Key Policies > Trusted Root Certification Authorities.

### macOS - Step 4.2

1. Copy Example-Lab-Root-CA.crt to the Mac.
2. Double-click the file. Keychain Access opens.
3. When prompted for a keychain, choose System so the certificate applies to all users. Authenticate as an administrator.
4. In Keychain Access, select the System keychain and find your CA by name.
5. Double-click the certificate to open it.
6. Expand the Trust section.
7. Set "When using this certificate" to Always Trust.
8. Close the window and authenticate again to save.

The certificate should now show a blue plus badge and read "This certificate is marked as trusted for all users".
Command line alternative:

```plaintext
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain Example-Lab-Root-CA.crt
```

## ClearPass configuration - Step 5

### Create the user account - Step 5.1

This guide authenticates against the ClearPass local user database. In production you would point the same services at Active Directory or LDAP instead. The authentication backend selection has no impact on the instructions that follow.

1. Go to Configuration > Identity > Local Users.
2. Click Add.
3. User ID: the login name the client will type.
4. Name: a display name.
5. Password: set one, and note it for testing.
6. Role: select [Employee].
7. Ensure Enabled is ticked, and Change Password on Next Login is not.
8. Save.

**IMPORTANT**: The Role assigned here is what the enforcement policy in 5.3 matches on. If you assign a different role, adjust the policy to match or the user will be denied.

### Add the network devices - Step 5.2

Note that a RADIUS client is usually a switch or AP, something that speaks 802.1X. ClearPass refers to RADIUS clients as a "Network Access Device" (NAD).
ClearPass will not answer a RADIUS request from a source it does not recognise. Every device that sends RADIUS must be listed here: each switch, and each individual access point. If a device's IP changes, ClearPass must be updated with the new IP.

1. Go to Configuration > Network > Devices.
2. Click Add.
3. Name: a descriptive label.
4. IP or Subnet Address: the address the device will send RADIUS FROM.
5. Description: optional but recommended.
6. RADIUS Shared Secret: generate a long random string. Enter it twice.
7. Vendor Name: HPE Networking, for EX, SRX, and Mist access points alike.
8. Tick Enable RADIUS Dynamic Authorization, port 3799, if you intend to use Change of Authorization later.
9. Save. Repeat for every device.

> Note: ClearPass matches a RADIUS client by the source IP of the packet, not by name or by any field inside the request. If a device sends from a different interface than the one you registered, ClearPass logs it as an unknown client and the authentication fails. The log entry will not mention shared secrets or the device name, so this failure looks nothing like what it is.

Record the shared secrets. You will enter them again in Mist and on the switch, and ClearPass will never show them to you again.

### Create the enforcement policy - Step 5.3

The enforcement policy decides what to send back once a user has authenticated. Build the simplest thing that proves the chain: allow one role, deny everything else.

1. Go to Configuration > Enforcement > Policies.
2. Click Add.
3. Name: 802.1X Enforcement.
4. Enforcement Type: RADIUS.
5. Default Profile: [Deny Access Profile].
6. Move to the Rules tab.
7. Rule Evaluation Algorithm: First applicable.
8. Add a rule. Type: Tips. Name: Role. Operator: EQUALS. Value: [Employee].
9. Profile for that rule: [Allow Access Profile].
10. Save.

### Create the wireless service - Step 5.4

1. Go to Configuration > Services.
2. Click Add.
3. Type: 802.1X Wireless.
4. Name: 802.1X Wireless.
5. On the Service tab, confirm the match conditions include Radius:IETF NAS-Port-Type EQUALS Wireless-802.11 (19).
6. On the Authentication tab, set Authentication Methods to [EAP PEAP] and [EAP MSCHAPv2].
7. Set Authentication Sources to [Local User Repository].
8. On the Enforcement tab, select the 802.1X Enforcement policy from step 5.3.
9. Save, and ensure the service is Enabled.

### Create the wired service - Step 5.5

Repeat the previous section with two changes: choose type 802.1X Wired, and confirm the match condition is NAS-Port-Type EQUALS Ethernet (15). Add [PAP] to the authentication methods if you want to be able to test the service without a supplicant.

> Note: ClearPass evaluates services top to bottom and stops at the first match. Go to Configuration > Services and confirm your two new services are not shadowed by a broader service above them. 
 
## Wireless configuration (Mist) - Step 6

For testing, create a *new* WLAN. Do not convert an existing production SSID to 802.1X as it is likely users will be denied access. If you have distributed certs to everyone and enjoy excitement in your life, sure go ahead with a production WLAN.

### Confirm access point addressing - Step 6.1

1. In the Mist dashboard, go to Access Points.
2. Note the IP address of each access point.
3. Confirm each of those addresses is registered in ClearPass as a network device, per step 5.2.

Every access point authenticates independently. All of them must be known to ClearPass.

### Create the WLAN - Step 6.2

1. Go to Site > WLANs, or Organization > WLAN Templates if you use templates.
2. Click Add WLAN.
3. Set the SSID.
4. Security: select Enterprise (802.1X), sometimes shown as EAP.
5. Under Authentication Servers, click Add Server.
6. Hostname/IP: your ClearPass address. In this example 10.0.3.210.
7. Port: 1812.
8. Shared Secret: the secret you set for the access points in ClearPass - step 5.2.
9. Under Accounting Servers, add the same host with port 1813 and the same secret.
10. VLAN: enable tagging and set your client VLAN, for example 100.
11. Apply the WLAN to the site or to the desired access points.
12. Save.

> Note: Enable accounting even if you don't really need it for testing. ClearPass learns client IP addresses from RADIUS accounting, and that IP-to-user mapping is what the SRX user firewall integration in section 8 consumes.

### Confirm deployment - Step 6.3

There is a delay of several minutes before the APs will receive the new config from the Mist cloud. Confirm in the Mist dashboard that they show as connected and that the new SSID is broadcast. It will also be visible from a client device.

## HPE Networking EX wired configuration - Step 7

> Note: Enabling 802.1X on a port will disconnect anything not set up to authenticate. On a switch carrying live traffic this can remove your own access or disable necessary services. Identify your target port before configuring anything, and never apply 802.1X to uplinks, aggregated interfaces, or management ports.

### Identify a safe test port - Step 7.1

Before touching configuration, establish what is connected where.

```plaintext
show interfaces terse | match "^ge-"
show lldp neighbors
show ethernet-switching table
show configuration interfaces
```

A good test port has no link, no LLDP neighbor, and no entries in the MAC table.

### Resolve RADIUS source addressing first - Step 7.2

Be aware of the egress interface used to source RADIUS. Thoroughly check routing instances and default route to assure the IP you think will be used is in fact the interface that will be used. If the switch has only one possible interface this simplifies things.

### Configure RADIUS and 802.1X - Step 7.3

Adapt the following as needed:

```plaintext
set access radius-server 10.0.3.210 port 1812
set access radius-server 10.0.3.210 accounting-port 1813
set access radius-server 10.0.3.210 secret "YOUR_SHARED_SECRET"
set access radius-server 10.0.3.210 source-address 10.0.3.244
set access radius-server 10.0.3.210 timeout 20
set access radius-server 10.0.3.210 retry 3

set access profile DOT1X-PROFILE authentication-order radius
set access profile DOT1X-PROFILE radius authentication-server 10.0.3.210
set access profile DOT1X-PROFILE radius accounting-server 10.0.3.210

set protocols dot1x authenticator authentication-profile-name DOT1X-PROFILE
set protocols dot1x authenticator interface ge-0/0/3.0 supplicant single
set protocols dot1x authenticator interface ge-0/0/3.0 transmit-period 10
set protocols dot1x authenticator interface ge-0/0/3.0 maximum-requests 3
```

> Note: I had to set the RADIUS timeout to twenty seconds because my ClearPass delays Access-Reject by roughly 15 seconds. I do not know if this is a deliberate feature of ClearPass or something to do with my implementation. In my case a shorter timeout made the switch give up before an accept/reject arrived. It retried 3 times and eventually reported the RADIUS server as dead. YMMV.

Review before committing, then "commit confirmed":

```plaintext
show | compare
commit confirmed 5
```

Assuming you are still connected, do another "commit."

### Verify - Step 7.4

```plaintext
show dot1x interface ge-0/0/3.0 detail
show network-access aaa statistics radius
```

Then plug in the test client and watch ClearPass Access Tracker. Check section 9 for details.

## HPE Networking SRX user firewall integration - Step 8

### What this integration does - Step 8.1

The SRX integrated user firewall matches source-identity in security policies, so rules can be written against users and roles rather than IP addresses. To do that the SRX needs a feed of IP-to-user-to-role mappings. ClearPass supplies that feed by pushing authentication data to the SRX over its RESTful web API.

The direction matters: ClearPass initiates the connection outbound to the SRX. The SRX does not poll ClearPass.

### SRX side outline - Step 8.2

On the SRX you will need a web API user for ClearPass to authenticate as, the web API service enabled and reachable from the ClearPass address, and a user identification authentication source configured to accept the ClearPass feed. Confirm exact syntax against your Junos version.

Ensure host-inbound traffic permits the ClearPass management address to reach the web API port on whichever interface it arrives.

### ClearPass side outline - Step 8.3

1. Go to Administration > External Servers > Endpoint Context Servers.
2. Add a server of the appropriate HPE Networking type, pointing at the SRX address.
3. Supply the web API credentials created on the SRX.
4. Create an enforcement profile that posts session data to that context server.
5. Add that profile to your enforcement policy so it fires on successful authentication.

### Policy  - Step 8.4

Once the SRX is receiving mappings, security policies can match source-identity. Verify the SRX has learned entries before writing rules that depend on them, otherwise a policy that looks correct will simply never match.

## Client configuration and testing - Step 9

### Windows client, wireless - Step 9.1

1. Confirm the root CA is installed per section 4.1.
2. Open Settings > Network & Internet > Wi-Fi, and select the new SSID. If Windows prompts for credentials directly, you can enter them, but configuring the profile explicitly is more reliable and lets you set server validation.
3. For explicit configuration, open Control Panel > Network and Sharing Center > Set up a new connection > Manually connect to a wireless network.
4. Network name: your SSID. Security type: WPA2-Enterprise or WPA3-Enterprise. Encryption: AES.
5. Click Change connection settings, then the Security tab.
6. Choose network authentication method: Microsoft: Protected EAP (PEAP). Click Settings.
7. TICK "Verify the server's identity by validating the certificate".
8. TICK "Connect to these servers" and enter the exact common name of the ClearPass certificate, for example clearpass.example.org.
9. In Trusted Root Certification Authorities, tick ONLY your own root CA.
10. Authentication Method: Secured password (EAP-MSCHAP v2).
11. Click Configure and untick "Automatically use my Windows logon name and password" so you can enter the ClearPass local user credentials.
12. OK back out, then connect and supply the username and password from step 5.1.

### macOS client, wireless - Step 9.2

1. Confirm the root CA is installed and trusted per section 4.2.
2. Click the Wi-Fi menu and select the SSID.
3. macOS prompts for a username and password. Enter the ClearPass local user credentials.
4. A certificate verification dialog appears showing the ClearPass server certificate. Click Show Certificate and confirm the issuer is your root CA and the name matches.
5. Click Continue and authenticate as a local administrator to store the trust decision.

For managed fleets, distribute a configuration profile containing the root CA and the network payload rather than relying on users to inspect certificates correctly.

### Windows client, wired - Step 93

1. Open services.msc.
2. Find Wired AutoConfig. Set Startup type to Automatic and Start the service.
3. Open Network Connections, right-click the Ethernet adapter, Properties.
4. An Authentication tab now appears. Tick "Enable IEEE 802.1X authentication".
5. Configure PEAP exactly as in 9.1, including server validation and root CA selection.

> Note: I ran into a confusing issue with Windows and wired auth. For wired auth to work the "Wired AutoConfig" service must be running or there is no Authentication tab at all, and the adapter will never attempt 802.1X. On my PC it wasn't running and It took a fair bit of Googling to figure out the issue, YMMV.

### Expected outcomes - Step 9.4

Watch results in ClearPass under Monitoring > Live Monitoring > Access Tracker.

Table: Outcomes

| Scenario | Expected result | Where visible |
|---|---|---|
| Valid user in [Employee] | ACCEPT | Access Tracker, Login Status ACCEPT, correct service name |
| Valid user, wrong password | REJECT | Access Tracker, roughly 17s before the client sees it |
| User not in [Employee] | REJECT | Access Tracker, enforcement hit the default deny |
| Unknown username | REJECT | Access Tracker |
| Device not registered as a network device | Nothing in Access Tracker | Event Viewer, RADIUS / ERROR / Unknown |
| Wrong shared secret | Nothing in Access Tracker | Event Viewer |
| Client rejects server certificate | REJECT or no completion | Access Tracker Alerts tab on the entry |

A successful wireless authentication looks like this in Access Tracker:

```plaintext
Server Name  Source  Username   Service              Login Status
clearpass    RADIUS  jsmith     802.1X Wireless      ACCEPT
```

Open the entry and check the tabs. Confirm the correct service matched, the expected role was assigned, and the enforcement profile applied was [Allow Access Profile].

### Verify VLAN assignment separately - Step 9.5

> **GOTCHA**: An ACCEPT proves authentication and authorisation succeeded. It does not prove the client landed in the intended VLAN. Check the client IP address on the device itself and confirm it sits in the expected subnet.

## Troubleshooting - Step 10

### Diagnostic order - Step 10.1

1. Access Tracker. Is the request there at all?
2. If absent, Event Viewer. Look for RADIUS / ERROR / Authentication / Unknown, which means the source IP is not a registered network device.
3. If present but rejected, open the entry and read the Alerts tab.
4. If nothing is logged anywhere, check the RADIUS service is genuinely processing, per 3.4.

### Common failures - Step 10.2

Table: Diagnostic Table

| Symptom | Likely cause | Fix |
|---|---|---|
| Nothing in Access Tracker, nothing in Event Viewer | RADIUS service wedged, often after a certificate change | Restart RADIUS server per section 3.3, then retest |
| Event Viewer shows RADIUS Unknown | Source IP not registered, or device sending from an unexpected interface | Add the actual source IP as a network device, or pin the source on the device |
| Request rejected immediately, no service name | No service matched the request | Check NAS-Port-Type against your service conditions, section 5.6 |
| Client reports it cannot verify the server | Root CA not installed on the client, or wrong server name configured | See section 4, and confirm the name matches the certificate exactly |
| Certificate import rejected by ClearPass | Root CA not in the Trust List | Complete section 3.1 before section 3.2 |
| Switch reports RADIUS server dead when a user is simply denied | Switch timeout shorter than the ClearPass reject delay | Raise timeout above 20 seconds, section 7.3 |
| Wireless works, wired does nothing on Windows | Wired AutoConfig service not running | See section 9.3 |
| All clients on one AP fail, others fine | That access point changed IP address | Reserve AP addresses in DHCP, section 5.2 |

### Two behaviors that mislead - Step 10.3

**Silence is not failure.**

ClearPass delays Access-Reject by roughly seventeen seconds and drops some requests without replying at all. A test client that hears nothing has learned nothing. Always confirm against Access Tracker.

**A green service status is not proof of function.**

After a RADIUS/EAP certificate change the service reports Running while processing nothing. Confirm with a real authentication attempt, never with the status label.

## Appendix: values to record

Fill this in as you build. Several of these are shown once and cannot be retrieved later.

Table: Check List

| Item | Value | Notes |
|---|---|---|
| ClearPass RADIUS address | | Address devices will target |
| ClearPass certificate CN | | Must match what clients validate |
| Root CA file location | | Distributed to every client |
| Root CA key location | | Protect. Never distribute. |
| PKCS#12 passphrase | | Needed only at import time |
| EX shared secret | | Not retrievable from ClearPass afterwards |
| SRX shared secret | | |
| AP shared secret | | Same secret usable across all APs |
| Test username | | Must hold the role the policy allows |
| Test client MAC | | For filtering Access Tracker |
| Client VLAN | | Verify separately per section 9.5 |

### Certificate renewal

The server certificate expires on the schedule set in section 2.4, two years by default. The root expires much later. When the server certificate is renewed:

1. Reissue from the same CA using the commands in 2.4 and 2.5.
2. Import to the RADIUS/EAP usage per 3.2.
3. RESTART the RADIUS service per 3.3. This is where renewals commonly break.
4. Clients need no change, because the root is unchanged.

> **WARNING**: If you renew the ClearPass web certificate through some other process, the RADIUS/EAP certificate does NOT follow automatically. They are separate usages. Forgetting this takes 802.1X down months after the work appeared finished.

### Hardening beyond this guide

- Move authentication from the local user database to Active Directory or LDAP.
- Replace PEAP-MSCHAPv2 with EAP-TLS and per-device client certificates. This removes passwords from the wire entirely and is the strongest option, at the cost of running certificate distribution.
- Add VLAN assignment or downloadable roles to the enforcement policy once plain authentication is proven.
- Add a MAC authentication fallback service for devices that cannot run a supplicant, scoped tightly.
- Enable Change of Authorization so policy changes can be pushed to live sessions.


 