# Navigating the Shadows of Dark Fiber Connectivity

**Jad Dimabuyu - 11/21/2024**

Juniper's Converged Optical Routing Architecture -- Unamplified Links. Explore the solution for High-Capacity Transport using 400G OpenZR+ Optics.

## Introduction

This TechPost will cover configurations, monitoring, and test plans for provisioning 400G OpenZR+ Optics. In designing a Dark Fiber Network, it is important to do link budget calculations. Network operators typically require margins in anticipation of additional splices due to fiber breaks and insertion of repair cables. Do we really need this margin? Let's figure out from the tests shown in this article.

## Topology

The topology will use JCO400-QDD-ZR-M-HP as transceivers; PTX10001-36MR, ACX7100-48L, and MX304 as routers; and ADTRAN 8CSM+#19430-#19290 as Mux/DeMux. A 75 km fiber optic cable will be used and a Variable Optical Attenuator (VOA) to emulate a longer fiber optic cable.

Traffic will go through a snake topology. Router ports are interconnected using l2circuit local switching. At the end of the snake on PTX, the interface is configured as host-side output loopback. In this loopback mode, traffic will be received by the transceiver's DSP and sent back to the media interface again. These loopbacks are defined by CMIS 4.0 and above.

The traffic flow is illustrated below.

### Physical Topology - Traffic Flow

![Physical Topology - Traffic Flow](images/picture3.png)

### Logical Topology - Traffic Flow

![Logical Topology - Traffic Flow](images/picture4.png)

## Power Propagation Calculation

![Power Propagation Calculation](images/picture5.png)

Calculation of the Rx Power:

```
Rx Power per lambda (PTX) = Tx Power (per lambda) - Sum*losses
Rx Power per lambda (PTX) = Tx Power (per lambda) - Mux Loss - VOA Loss - Span Loss -- DeMux Loss
Rx Power per lambda (PTX) = 0dBm - 2dB - 1dB - 0.19dB/km * 75k* - 2dB
Rx Power per lambda (PTX) = 0dBm - 2dB - 1dB - 14.25dB - 2dB
Rx Power per lambda (PTX) = 0dBm - 19.25dB
Rx Power per lambda (PTX) = -19.25dBm
``` 

The PTX Side will expect close to -19.25dBm per channel. Not all channels will have the same Rx Power, but it will be close to the calculated value. The Rx Power on all channels will be balanced by setting the initial target Rx Power to -20dBm. This is done by changing the Tx Power per channel on the MX and ACX side.

## Channel Plan

ADTRAN 8CSM+#19430-#19290 is a passive filter with fixed frequencies on each port.

| ADTRANPort | Frequency | Wavelength | PTX10001-36MRInterface | MX304Interface | ACX7100-48LInterface |
|:--|:--|:--|:--|:--|:--|
| C1 | 194.300 THz | 1542.94 nm | et-0/0/0 | et-0/1/6 | - |
| C2 | 194.100 THz | 1544.53 nm | et-0/0/2 | et-0/1/8 | - |
| C3 | 193.900 THz | 1546.12 nm | et-0/0/8 | - | et-0/0/48 |
| C4 | 193.700 THz | 1547.72 nm | et-0/0/10 | - | et-0/0/49 |

## Supported 400G OpenZR+ Clients

As of writing this article, JCO400-QDD-ZR-M-HP supports the following 400G OpenZR+ and 400ZR OIF modes. More Host and Media Modes might be supported in the future via Firmware Upgrade.

| Host Interface | FEC | Modulation | Symbol Baud Rate | Media Interface | MSA Compliance |
|:--|:--|:--|:--|:--|:--|
| 1x400G | CFEC | 16QAM | 59,843,750,000 | 400ZR | OIF 400ZR IA |
| 4x100G | CFEC | 16QAM | 59,843,750,000 | 400ZR | OIF 400ZR IA |
| 1x400G | OFEC | 16QAM | 60,138,546,798 | ZR-400-OFEC-16QAM | OpenZR+ MSA |
| 4x100G | OFEC | 16QAM | 60,138,546,798 | ZR-400-OFEC-16QAM | OpenZR+ MSA |
| 3x100G | OFEC | 8QAM | 60,138,546,798 | ZR-300-OFEC-8QAM | OpenZR+ MSA |
| 2x100G | OFEC | QPSK | 60,138,546,798 | ZR-200-OFEC-QPSK | OpenZR+ MSA |
| 1x100G | OFEC | QPSK | 30,069,273,399 | ZR-100-OFEC-QPSK | OpenZR+ MSA |

In this post, we will test the different OpenZR+ Media Interfaces namely: ZR-400-OFEC-16QAM, ZR-300-OFEC-8QAM, ZR-200-OFEC-QPSK, and ZR-100-OFEC-QPSK. Each Media Interface will have different RX Sensitivity due to the different modulation and/or symbol rates.

## Router Configuration

This section will cover the configurations needed to deploy ZR/ZR+ transceivers. For the configurations used for testing, refer to the Extensive Router Configuration Section of this article.

### Setting Port Speed

Junos will automatically set the Media Interface according to the configured speed and number of sub-ports.

| Media Interface | PORT-SPEED | NUMBER-OF-CHANNELS |
|:--|:--|:--|
| ZR-400-OFEC-16QAM | 400g | N/A |
| ZR-400-OFEC-16QAM | 100g | 4 |
| ZR-300-OFEC-8QAM | 100g | 3 |
| ZR-200-OFEC-QPSK | 100g | 2 |
| ZR-100-OFEC-QPSK | 100g | N/A |

### ACX EVO Series and PTX EVO Series Routers except PTX10003

```
interfaces {
    $INTERFACE_NAME$ {
        speed $PORT-SPEED$;
        number-of-sub-ports $NUMBER-OF-CHANNELS$;              #Exclude if N/A
    }
}
```

### MX Series Routers and PTX10003

```
chassis {
    fpc $FPC$ {
        pic $PIC$ {
            port $PORT$ {
                speed $PORT-SPEED$;
                number-of-sub-ports $NUMBER-OF-CHANNELS$;      #Exclude if N/A
            }
        }
    }
}
```

### Setting Optics Options

Use the wavelength specified in the Channel Plan

```
interfaces {
    $INTERFACE_NAME$ {
        optics-options {
             wavelength $WAVELENGTH$;
             tx-power $TX-POWER$;
        }     
    }
}     
```

Note: For channelized interfaces, optics-options are configured on the first sub-port (et-x/y/z:0) NOT on the parent port (et-x/y/z).

### Interconnecting Interfaces

```
interfaces {
    $INTERFACE_START$ {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
        }
    }
    $INTERFACE_END$ {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
        }
    }
}
protocols {
    l2circuit {
        local-switching {
            interface $INTERFACE_START$.0 {
                end-interface {
                    interface $INTERFACE_END$.0;
                }
            }
        }
    }
    mpls {
        interface all;
    }
}
```

### Configuring CMIS Loopback

There are four Loopback Types defined by CMIS. For details about these Loopback Types, [read CMIS 4.0](http://www.qsfp-dd.com/wp-content/uploads/2019/05/QSFP-DD-CMIS-rev4p0.pdf) - Section 8.10.1.

```
interfaces {
    $INTERFACE_NAME$ {
        optics-options {
            loopback {
                loopbacktype $LOOPBACK-TYPE$;
           # options are host-side-out, host-side-in, media-side-out, media-side-in
            }
        }    
    }
}
```

## Test Procedures

The transceivers under test are the ones inserted in PTX10001-36MR. Initially, the TX Power on MX304 and ACX7100-48L will be adjusted to have a target Rx Power of -20dBm.

A Python script is set up to run every 15 minutes (XX:00, XX:15, XX:30, XX:45). The script will start at 0dB attenuation. The script will capture the Versatile Diagnostics Monitoring (VDM) or Performance Monitoring (PM) from all interfaces being tested at the end of every 15-minute interval.

After capturing the data, the script will increase the attenuation by 0.5dB, capture the data at the end of the 15-minute interval, and repeat until all channels are down.

The captured VDM/PM will be the average Pre-FEC BER, Uncorrected FER, and Rx Power. The captured data will be saved on InfluxDB and visualized by Grafana. This is based on [IPoDWDM-TIG](https://github.com/jadimabuyu/IPoDWDM-TIG). The Python script and Grafana Dashboard were modified for the test procedures.

For more information on how the router collects VDM please refer to the More Information Section of this article.

## Results

Columns highlighted yellow indicate that the Rx Power is below the advertised Rx Sensitivity. The column highlighted ** in red ** indicates that the channel is down.

For brevity, only et-0/0/8, the worst-performing transceiver is shown. For the rest of the results, go to the "Extensive Results" section of this article.

### 1x400GE - ZR-400-OFEC-16QAM Results

For the ZR-400-OFEC-16QAM Media Interface, the link was lost at -26dBm. This is 3dB lower than the advertised Rx Sensitivity.

![1x400GE - ZR-400-OFEC-16QAM Results](images/picture6.png)

![1x400GE - ZR-400-OFEC-16QAM Results for et-0/0/8](images/picture7.png)

### 3x100GE - ZR-300-OFEC-8QAM Results

For the ZR-300-OFEC-8QAM Media Interface, the link was lost at -29dBm. This is 3dB lower than the advertised Rx Sensitivity.

![3x100GE - ZR-300-OFEC-8QAM Results for et-0/0/8](images/picture8.png)

![3x100GE - ZR-300-OFEC-8QAM Results for et-0/0/8](images/picture9.png)

### 2x100GE - ZR-200-OFEC-QPSK Results

For the ZR-200-OFEC-QPSK Media Interface, the link was lost at -33.5dBm. This is 3.5dB lower than the advertised Rx Sensitivity.

![2x100GE - ZR-200-OFEC-QPSK Results for et-0/0/8](images/picture10.png)

![2x100GE - ZR-200-OFEC-QPSK Results for et-0/0/8](images/picture11.png)

### 1x100GE - ZR-100-OFEC-QPSK Results

For the ZR-100-OFEC-QPSK Media Interface, the link was lost at -37dBm. This is 5dB lower than the advertised Rx Sensitivity.

![1x100GE - ZR-100-OFEC-QPSK Results for et-0/0/8](images/picture12.png)

![1x100GE - ZR-100-OFEC-QPSK Results for et-0/0/8](images/picture13.png)

## Results Summary

| Media Interface | Advertised Rx Sensitivity and Q-Margin | Measured Rx Sensitivity | Rx Margin |
|:--|:--|:--|:--|
| ZR-400-OFEC-16QAM | -23.0 dBm with >1.5 dB Q-Margin | -26.0 dBm | 3.0 dB |
| ZR-300-OFEC-8QAM | -26.0 dBm with >2.5 dB Q-Margin | -29.0 dBm | 3.0 dB |
| ZR-200-OFEC-QPSK | -30.0 dBm with >3.0 dB Q-Margin | -33.5 dBm | 3.5 dB |
| ZR-100-OFEC-QPSK | -32.0 dBm with >5.0 dB Q-Margin | -37.0 dBm | 5.0 dB |

In conclusion, it is recommended to design at the advertised Rx Sensitivity. As evidenced by the testing, margins are already included.

## More Information

### Mux/Demux

Mux/DeMux or Multiplexer/Demultiplexer is a passive optical component that is used to aggregate multiple WDM signals into a single pair of fiber optic cables. The multiplexer component aggregates multiple wavelengths of light into a single fiber. The demultiplexer separates them back to separate wavelengths. For example, ADTRAN 8CSM+#19430-#19290 is an 8-channel Mux/DeMux with 200GHz Grid spacing. It can carry 3.2Tbps using 400G transceivers or 6.4Tbps using 800G transceivers. This component has a 2dB Insertion Loss.

### Performance Monitoring (PM) / Versatile Diagnostics Monitoring (VDM)

The transceivers have a feature called Versatile Diagnostics Monitoring. VDM parameters are observables that are useful for diagnostics and performance monitoring.  The router polls the transceivers every second. The router then stores the measurements into two bins: a 15-minute bin, and a 1-day bin. Customizable interval bins might be supported in later releases.

The 15-minute bin begins at the 00th, 15th, 30th, and 45th of the hour. The 1-day bin begins at 00:00-UTC. These bins will have the maximum, minimum, and average values for the whole bin's interval. The 15-minute average values are used for the tests done in this article.

Dashboards can be created to visualize these PM metrics. An example is this [IPoDWDM-TIG](https://github.com/jadimabuyu/IPoDWDM-TIG).

### Q-Value and Q-Margin

Other PM metrics used in this article are Q-Value and Q-Margin. It is a metric to measure the quality of an optical link. It is directly calculated from the Pre-FEC BER.

The Q-Value and Q-Margin are manually calculated by the Python Script used in this test as the transceiver does not support these PM metrics yet. These will be supported when the transceivers are upgraded to support C-CMIS 1.3.

The following formulas are used to compute the Q-Value and Q-Margin (from [https://www.oiforum.com/wp-content/uploads/OIF-C-CMIS-01.3.pdf](https://www.oiforum.com/wp-content/uploads/OIF-C-CMIS-01.3.pdf) and [https://www.itu.int/itu-t/recommendations/rec.aspx?rec=16153](https://www.itu.int/itu-t/recommendations/rec.aspx?rec=16153))

- Q*value* = 20*log*10 (sqrt2*erf *-1 (1-2*BER*) )
- Q*margin* = Q*value* - Q*value@FECThreshold*     FEC Threshold for OFEC is 2.00E-2
- Q*margin* = Q*value* - 20*log*10 (sqrt2*erf *-1 (1-2*2.00*x*10-2 ) )
- Q*margin* = Q*value* - 6.25*dB*

### Link Budget

The following formula can be used to calculate the distances that can be achieved.

![Formula](images/picture14.png)

JCO400-QDD-ZR-M-HP has Tx Power = 0dBm and 4 different Rx Sensitivities depending on the Media Interface mode used.

- ZR-400-OFEC-16QAM has RX Sensitivity of -23dBm,
- ZR-300-OFEC-8QAM is -26dBm,
- ZR-200-OFEC-QPSK is -30dBm,
- ZR-100-OFEC-QPSK is -32dBm.

Mux Loss and DeMux Loss vary by the number of channels. Typically, the Mux and DeMux losses are equal. 8-channel mux/demux typically have 2dB loss, 48-channel mux/demux typically have 5.5dB loss, and 64-channel mux/demux typically have 6.5dB loss.

As a guidance, the below table shows the distances that can be achieved using different combinations of numbers of channels and media interface modes.

Let: Fiber Loss Coefficient = 0.25dB/km, Margin = 0

| Number of channels | ZR-400-OFEC-16QAM | ZR-300-OFEC-8QAM | ZR-200-OFEC-QPSK | ZR-100-OFEC-QPSK |
|:--|:--|:--|:--|:--|
| 1-channel (no mux/demux) | 92km | 104km | 120km | 128km |
| 8-channels | 76km | 88km | 104km | 112km |
| 48-channels | 48km | 60km | 76km | 84km |
| 64-channels | 40km | 52km | 68km | 76km |

## Extensive Results

### 1x400GE -- ZR-400-OFEC-16QAM Results

![et-0/0/0 - 1x400GE -- ZR-400-OFEC-16QAM Results](images/picture15.png)

![et-0/0/0 - 1x400GE -- ZR-400-OFEC-16QAM Results](images/picture16.png)

![et-0/0/2 - 1x400GE -- ZR-400-OFEC-16QAM Results](images/picture17.png)

![et-0/0/2 - 1x400GE -- ZR-400-OFEC-16QAM Results](images/picture18.png)

![et-0/0/8 - 1x400GE -- ZR-400-OFEC-16QAM Results](images/picture19.png)

![et-0/0/8 - 1x400GE -- ZR-400-OFEC-16QAM Results](images/picture20.png)

![et-0/0/10 - 1x400GE -- ZR-400-OFEC-16QAM Results](images/picture21.png)

![et-0/0/10 - 1x400GE -- ZR-400-OFEC-16QAM Results](images/picture22.png)

### 3x100GE -- ZR-300-OFEC-8QAM Results

![et-0/0/0 - 3x100GE -- ZR-300-OFEC-8QAM Results](images/picture23.png)

![et-0/0/0 - 3x100GE -- ZR-300-OFEC-8QAM Results](images/picture24.png)

![et-0/0/2 - 3x100GE -- ZR-300-OFEC-8QAM Results](images/picture25.png)

![et-0/0/2 - 3x100GE -- ZR-300-OFEC-8QAM Results](images/picture26.png)

![et-0/0/8 - 3x100GE -- ZR-300-OFEC-8QAM Results](images/picture27.png)

![et-0/0/8 - 3x100GE -- ZR-300-OFEC-8QAM Results](images/picture28.png)

![et-0/0/10 - 3x100GE -- ZR-300-OFEC-8QAM Results](images/picture29.png)

![et-0/0/10 - 3x100GE -- ZR-300-OFEC-8QAM Results](images/picture30.png)

### 2x100GE -- ZR-200-OFEC-QPSK Results

![et-0/0/0 - 2x100GE -- ZR-200-OFEC-QPSK Results](images/picture31.png)

![et-0/0/0 - 2x100GE -- ZR-200-OFEC-QPSK Results](images/picture32.png)

![et-0/0/2 - 2x100GE -- ZR-200-OFEC-QPSK Results](images/picture33.png)

![et-0/0/2 - 2x100GE -- ZR-200-OFEC-QPSK Results](images/picture34.png)

![et-0/0/8 - 2x100GE -- ZR-200-OFEC-QPSK Results](images/picture35.png)

![et-0/0/8 - 2x100GE -- ZR-200-OFEC-QPSK Results](images/picture36.png)

![et-0/0/10 - 2x100GE -- ZR-200-OFEC-QPSK Results](images/picture37.png)

![et-0/0/10 - 2x100GE -- ZR-200-OFEC-QPSK Results](images/picture38.png)

### 1x100GE -- ZR-100-OFEC-QPSK Results

![et-0/0/0 - 1x100GE -- ZR-100-OFEC-QPSK Results](images/picture39.png)

![et-0/0/0 - 1x100GE -- ZR-100-OFEC-QPSK Results](images/picture40.png)

![et-0/0/2  - 1x100GE -- ZR-100-OFEC-QPSK Results](images/picture41.png)

![et-0/0/2  - 1x100GE -- ZR-100-OFEC-QPSK Results](images/picture42.png)

![et-0/0/8 - 1x100GE -- ZR-100-OFEC-QPSK Results](images/picture43.png)

![et-0/0/8 - 1x100GE -- ZR-100-OFEC-QPSK Results](images/picture44.png)

![et-0/0/10 - 1x100GE -- ZR-100-OFEC-QPSK Results](images/picture45.png)

![et-0/0/10 - 1x100GE -- ZR-100-OFEC-QPSK Results](images/picture46.png)

## Extensive Router Configurations

### 1x400GE -- ZR-400-OFEC-16QAM Configuration

PTX10001-36MR Configuration for Interface Bring-Up

```
interfaces {
    et-0/0/0 {
        description "TO ADTRAN C1 PORT";
        speed 400g;
        optics-options {
            wavelength 1542.94;
            tx-power 0;
        }
    }
    et-0/0/2 {
    description "TO ADTRAN C2 PORT";
        speed 400g;
        optics-options {
            wavelength 1544.53;
            tx-power 0;
        }
    }
    et-0/0/8 {
    description "TO ADTRAN C3 PORT";
        speed 400g;
        optics-options {
            wavelength 1546.12;
            tx-power 0;
        }
    }
    et-0/0/10 {
    description "TO ADTRAN C4 PORT";
        speed 400g;
        optics-options {
            wavelength 1547.72;
            tx-power 0;
        }
    }
    et-0/2/10 {
        description "TO SPIRENT";
        speed 400g;
    }
}
```

MX304 Configuration for Interface Bring-Up

```
chassis {
    fpc 0 {
        pic 1 {
            port 6 {
                speed 400g;
            }
            port 8 {
                speed 400g;
            }
        }
    }
}

interfaces {
    et-0/1/6 {
    description "TO ADTRAN C1 PORT";
        optics-options {
            wavelength 1542.94;
            tx-power -0.2;
        }
    }
    et-0/1/8 {
    description "TO ADTRAN C2 PORT";
        optics-options {
            wavelength 1544.53;
            tx-power -0.6;
        }
    }
}
```

ACX7100-48L Configuration for Interface Bring-Up

```
interfaces {
    et-0/0/48 {
    description "TO ADTRAN C3 PORT";
        speed 400g;
        optics-options {
            wavelength 1546.12;
            tx-power -0.6;
        }
    }
    et-0/0/49 {
    description "TO ADTRAN C4 PORT";
        speed 400g;
        optics-options {
            wavelength 1547.72;
            tx-power -0.6;
        }
    }
}
```

PTX10001-36MR Configuration for Traffic Flow

```
interfaces {
    et-0/0/0 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/2 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/8 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/10 {
        optics-options {
            loopback {
                loopbacktype host-side-out;
            }
        }    
 }
    et-0/2/10 {
    encapsulation ethernet-ccc;
        unit 0 {
            family ccc;
        }
    }
}
protocols {
    l2circuit {
        local-switching {
            interface et-0/2/10.0 {
                end-interface {
                    interface et-0/0/0.0;
                }
            }
            interface et-0/0/2.0 {
                end-interface {
                    interface et-0/0/8.0;
                }
            }
        }
    }
    mpls {
        interface all;
    }
}
```

MX304 Configuration for Traffic Flow

```
interfaces {
    et-0/1/6 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/1/8 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
}
protocols {
    l2circuit {
        local-switching {
            interface et-0/1/6.0 {
                end-interface {
                    interface et-0/1/8.0;
                }
            }
        }
    }
    mpls {
        interface all;
    }
}
```

ACX7100-48L Configuration for Traffic Flow

```
interfaces {
    et-0/0/48 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/49 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
}
protocols {
    l2circuit {
        local-switching {
            interface et-0/0/48.0 {
                end-interface {
                    interface et-0/0/49.0;
                }
            }
        }
    }
    mpls {
        interface all;
    }
}
```

### 3x100GE -- ZR-300-OFEC-8QAM Configuration

PTX10001-36MR Configuration for Interface Bring-Up

```
interfaces {
    et-0/0/0 {
        description "TO ADTRAN C1 PORT";
        speed 100g;
    number-of-sub-ports 3;
    }
    et-0/0/0:0 {
        optics-options {
            wavelength 1542.94;
            tx-power 0;
        }
    }
    et-0/0/2 {
        description "TO ADTRAN C2 PORT";
        speed 100g;
    number-of-sub-ports 3;
    }
    et-0/0/2:0 {
        optics-options {
            wavelength 1544.53;
            tx-power 0;
        }
    }
    et-0/0/8 {
        description "TO ADTRAN C3 PORT";
        speed 100g;
    number-of-sub-ports 3;
    }
    et-0/0/8:0 {
        optics-options {
            wavelength 1546.12;
            tx-power 0;
        }
    }
    et-0/0/10 {
        description "TO ADTRAN C4 PORT";
        speed 100g;
    number-of-sub-ports 3;
    }
    et-0/0/10:0 {
        optics-options {
            wavelength 1547.72;
            tx-power 0;
        }
    }
    et-0/2/10 {
        description "TO SPIRENT";
        speed 100g;
        number-of-sub-ports 4;
    }
}
```

Note: For channelized interfaces, optics-options are configured on the first sub-port NOT on the parent port.

MX304 Configuration for Interface Bring-Up

```
chassis {
    fpc 0 {
        pic 1 {
            port 6 {
                speed 100g;
                number-of-sub-ports 3;
            }
            port 8 {
                speed 100g;
                number-of-sub-ports 3;
            }
        }
    }
}

interfaces {
    et-0/1/6:0 {
    description "TO ADTRAN C1 PORT";
        optics-options {
            wavelength 1542.94;
            tx-power -0.2;
        }
    }
    et-0/1/8:0 {
    description "TO ADTRAN C2 PORT";
        optics-options {
            wavelength 1544.53;
            tx-power -0.6;
        }
    }
}
```

> Note 1: For MX Series and PTX10003, the speed and number-of-sub-ports are configured on the chassis level rather than the interface level. The optics-options are still configured on the interface level.

> Note 2: For channelized interfaces, optics-options are configured on the first sub-port NOT on the parent port.

ACX7100-48L Configuration for Interface Bring-Up

```
interfaces {
    et-0/0/48 {
    description "TO ADTRAN C3 PORT";
        speed 100g;
        number-of-sub-ports 3;
    }
    et-0/0/48:0 {
        optics-options {
            wavelength 1546.12;
            tx-power -0.6;
        }
    }
    et-0/0/49 {
    description "TO ADTRAN C4 PORT";
        speed 100g;
        number-of-sub-ports 3;
    }
    et-0/0/49:0 {
        optics-options {
            wavelength 1547.72;
            tx-power -0.6;
        }
    }
}
```

> Note: For channelized interfaces, optics-options are configured on the first sub-port NOT on the parent port.

PTX10001-36MR Configuration for Traffic Flow

```
interfaces {
    et-0/0/0:0 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/0:1 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/0:2 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/2:0 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/2:1 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/2:2 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/8:0 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/8:1 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/8:2 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/10:0 {
        optics-options {
            loopback {
                loopbacktype host-side-out;
            }
        }    
 }
    et-0/0/10:1 {
        optics-options {
            loopback {
                loopbacktype host-side-out;
            }
        }    
 }
    et-0/0/10:2 {
        optics-options {
            loopback {
                loopbacktype host-side-out;
            }
        }    
 }
    et-0/2/10:0 {
    encapsulation ethernet-ccc;
        unit 0 {
            family ccc;
        }
    }
    et-0/2/10:1 {
    encapsulation ethernet-ccc;
        unit 0 {
            family ccc;
        }
    }
    et-0/2/10:2 {
    encapsulation ethernet-ccc;
        unit 0 {
            family ccc;
        }
    }
}
protocols {
    l2circuit {
        local-switching {
            interface et-0/2/10:0.0 {
                end-interface {
                    interface et-0/0/0:0.0;
                }
            }
            interface et-0/2/10:1.0 {
                end-interface {
                    interface et-0/0/0:1.0;
                }
            }
            interface et-0/2/10:2.0 {
                end-interface {
                    interface et-0/0/0:2.0;
                }
            }
            interface et-0/0/2:0.0 {
                end-interface {
                    interface et-0/0/8:0.0;
                }
            }
            interface et-0/0/2:1.0 {
                end-interface {
                    interface et-0/0/8:1.0;
                }
            }
            interface et-0/0/2:2.0 {
                end-interface {
                    interface et-0/0/8:2.0;
                }
            }
        }
    }
    mpls {
        interface all;
    }
}
```

MX304 Configuration for Traffic Flow

```
interfaces {
    et-0/1/6:0 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/1/6:1 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/1/6:1 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/1/8:0 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/1/8:1 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/1/8:2 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
}
protocols {
    l2circuit {
        local-switching {
            interface et-0/1/6:0.0 {
                end-interface {
                    interface et-0/1/8:0.0;
                }
            }
            interface et-0/1/6:1.0 {
                end-interface {
                    interface et-0/1/8:1.0;
                }
            }
            interface et-0/1/6:2.0 {
                end-interface {
                    interface et-0/1/8:2.0;
                }
            }
        }
    }
    mpls {
        interface all;
    }
}
```

ACX7100-48L Configuration for Traffic Flow

```
interfaces {
    et-0/0/48:0 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/48:1 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/48:2 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/49:0 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/49:1 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }

    et-0/0/49:2 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
}
protocols {
    l2circuit {
        local-switching {
            interface et-0/0/48:0.0 {
                end-interface {
                    interface et-0/0/49:0.0;
                }
            }
            interface et-0/0/48:1.0 {
                end-interface {
                    interface et-0/0/49:1.0;
                }
            }
            interface et-0/0/48:2.0 {
                end-interface {
                    interface et-0/0/49:2.0;
                }
            }
        }
    }
    mpls {
        interface all;
    }
}
```

### 2x100GE -- ZR-200-OFEC-QPSK Configuration

PTX10001-36MR Configuration for Interface Bring-Up

```
interfaces {
    et-0/0/0 {
        description "TO ADTRAN C1 PORT";
        speed 100g;
    number-of-sub-ports 2;
    }
    et-0/0/0:0 {
        optics-options {
            wavelength 1542.94;
            tx-power 0;
        }
    }
    et-0/0/2 {
        description "TO ADTRAN C2 PORT";
        speed 100g;
    number-of-sub-ports 2;
    }
    et-0/0/2:0 {
        optics-options {
            wavelength 1544.53;
            tx-power 0;
        }
    }
    et-0/0/8 {
        description "TO ADTRAN C3 PORT";
        speed 100g;
    number-of-sub-ports 2;
    }
    et-0/0/8:0 {
        optics-options {
            wavelength 1546.12;
            tx-power 0;
        }
    }
    et-0/0/10 {
        description "TO ADTRAN C4 PORT";
        speed 100g;
    number-of-sub-ports 2;
    }
    et-0/0/10:0 {
        optics-options {
            wavelength 1547.72;
            tx-power 0;
        }
    }
    et-0/2/10 {
        description "TO SPIRENT";
        speed 100g;
        number-of-sub-ports 4;
    }
}
```

> Note: For channelized interfaces, optics-options are configured on the first sub-port NOT on the parent port.

MX304 Configuration for Interface Bring-Up

```
chassis {
    fpc 0 {
        pic 1 {
            port 6 {
                speed 100g;
                number-of-sub-ports 2;
            }
            port 8 {
                speed 100g;
                number-of-sub-ports 2;
            }
        }
    }
}

interfaces {
    et-0/1/6:0 {
    description "TO ADTRAN C1 PORT";
        optics-options {
            wavelength 1542.94;
            tx-power -0.2;
        }
    }
    et-0/1/8:0 {
    description "TO ADTRAN C2 PORT";
        optics-options {
            wavelength 1544.53;
            tx-power -0.6;
        }
    }
}
```

> Note 1: For MX Series and PTX10003, the speed and number-of-sub-ports are configured on the chassis level rather than the interface level. The optics-options are still configured on the interface level.

> Note 2: For channelized interfaces, optics-options are configured on the first sub-port NOT on the parent port.

ACX7100-48L Configuration for Interface Bring-Up

```
interfaces {
    et-0/0/48 {
    description "TO ADTRAN C3 PORT";
        speed 100g;
        number-of-sub-ports 2;
    }
    et-0/0/48:0 {
        optics-options {
            wavelength 1546.12;
            tx-power -0.6;
        }
    }
    et-0/0/49 {
    description "TO ADTRAN C4 PORT";
        speed 100g;
        number-of-sub-ports 2;
    }
    et-0/0/49:0 {
        optics-options {
            wavelength 1547.72;
            tx-power -0.6;
        }
    }
}
```

> Note: For channelized interfaces, optics-options are configured on the first sub-port NOT on the parent port.

PTX10001-36MR Configuration for Traffic Flow

```
interfaces {
    et-0/0/0:0 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/0:1 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/2:0 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/2:1 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/8:0 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/8:1 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/10:0 {
        optics-options {
            loopback {
                loopbacktype host-side-out;
            }
        }    
 }
    et-0/0/10:1 {
        optics-options {
            loopback {
                loopbacktype host-side-out;
            }
        }    
 }
    et-0/2/10:0 {
    encapsulation ethernet-ccc;
        unit 0 {
            family ccc;
        }
    }
    et-0/2/10:1 {
    encapsulation ethernet-ccc;
        unit 0 {
            family ccc;
        }
    }
}
protocols {
    l2circuit {
        local-switching {
            interface et-0/2/10:0.0 {
                end-interface {
                    interface et-0/0/0:0.0;
                }
            }
            interface et-0/2/10:1.0 {
                end-interface {
                    interface et-0/0/0:1.0;
                }
            }
            interface et-0/0/2:0.0 {
                end-interface {
                    interface et-0/0/8:0.0;
                }
            }
            interface et-0/0/2:1.0 {
                end-interface {
                    interface et-0/0/8:1.0;
                }
            }
        }
    }
    mpls {
        interface all;
    }
}
```

MX304 Configuration for Traffic Flow

```
interfaces {
    et-0/1/6:0 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/1/6:1 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/1/8:0 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/1/8:1 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
}
protocols {
    l2circuit {
        local-switching {
            interface et-0/1/6:0.0 {
                end-interface {
                    interface et-0/1/8:0.0;
                }
            }
            interface et-0/1/6:1.0 {
                end-interface {
                    interface et-0/1/8:1.0;
                }
            }
        }
    }
    mpls {
        interface all;
    }
}
```

ACX7100-48L Configuration for Traffic Flow

```
interfaces {
    et-0/0/48:0 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/48:1 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/49:0 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/49:1 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
}
protocols {
    l2circuit {
        local-switching {
            interface et-0/0/48:0.0 {
                end-interface {
                    interface et-0/0/49:0.0;
                }
            }
            interface et-0/0/48:1.0 {
                end-interface {
                    interface et-0/0/49:1.0;
                }
            }
        }
    }
    mpls {
        interface all;
    }
}
```

### 1x100GE -- ZR-100-OFEC-QPSK Configuration

PTX10001-36MR Configuration for Interface Bring-Up

```
interfaces {
    et-0/0/0 {
        description "TO ADTRAN C1 PORT";
        speed 100g;
        optics-options {
            wavelength 1542.94;
            tx-power 0;
        }
    }
    et-0/0/2 {
    description "TO ADTRAN C2 PORT";
        speed 100g;
        optics-options {
            wavelength 1544.53;
            tx-power 0;
        }
    }
    et-0/0/8 {
    description "TO ADTRAN C3 PORT";
        speed 100g;
        optics-options {
            wavelength 1546.12;
            tx-power 0;
        }
    }
    et-0/0/10 {
    description "TO ADTRAN C4 PORT";
        speed 100g;
        optics-options {
            wavelength 1547.72;
            tx-power 0;
        }
    }
    et-0/2/10 {
        description "TO SPIRENT";
        speed 100g;
        number-of-sub-ports 4;
    }
}
```

MX304 Configuration for Interface Bring-Up

```
chassis {
    fpc 0 {
        pic 1 {
            port 6 {
                speed 100g;
            }
            port 8 {
                speed 100g;
            }
        }
    }
}

interfaces {
    et-0/1/6 {
    description "TO ADTRAN C1 PORT";
        optics-options {
            wavelength 1542.94;
            tx-power -0.2;
        }
    }
    et-0/1/8 {
    description "TO ADTRAN C2 PORT";
        optics-options {
            wavelength 1544.53;
            tx-power -0.6;
        }
    }
}
```

> Note: For MX Series and PTX10003, the speed and number-of-sub-ports are configured on the chassis level rather than the interface level. The optics-options are still configured on the interface level.

ACX7100-48L Configuration for Interface Bring-Up

```
interfaces {
    et-0/0/48 {
    description "TO ADTRAN C3 PORT";
        speed 100g;
        optics-options {
            wavelength 1546.12;
            tx-power -0.6;
        }
    }
    et-0/0/49 {
    description "TO ADTRAN C4 PORT";
        speed 100g;
        optics-options {
            wavelength 1547.72;
            tx-power -0.6;
        }
    }
}
```

PTX10001-36MR Configuration for Traffic Flow

```
interfaces {
    et-0/0/0 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/2 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/8 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/10 {
        optics-options {
            loopback {
                loopbacktype host-side-out;
            }
        }    
 }
    et-0/2/10:0 {
    encapsulation ethernet-ccc;
        unit 0 {
            family ccc;
        }
    }
}
protocols {
    l2circuit {
        local-switching {
            interface et-0/2/10:0.0 {
                end-interface {
                    interface et-0/0/0.0;
                }
            }
            interface et-0/0/2.0 {
                end-interface {
                    interface et-0/0/8.0;
                }
            }
        }
    }
    mpls {
        interface all;
    }
}
```

MX304 Configuration for Traffic Flow

```
interfaces {
    et-0/1/6 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/1/8 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
}
protocols {
    l2circuit {
        local-switching {
            interface et-0/1/6.0 {
                end-interface {
                    interface et-0/1/8.0;
                }
            }
        }
    }
    mpls {
        interface all;
    }
}
```

ACX7100-48L Configuration for Traffic Flow

```
interfaces {
    et-0/0/48 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
    et-0/0/49 {
        encapsulation ethernet-ccc;
        unit 0 {
            family ccc;        
    }
    }
}
protocols {
    l2circuit {
        local-switching {
            interface et-0/0/48.0 {
                end-interface {
                    interface et-0/0/49.0;
                }
            }
        }
    }
    mpls {
        interface all;
    }
}
```

## Useful links

- [https://www.oiforum.com/technical-work/implementation-agreements-ias/#Management ](https://www.oiforum.com/technical-work/implementation-agreements-ias/#Management)
- [http://www.qsfp-dd.com/wp-content/uploads/2019/05/QSFP-DD-CMIS-rev4p0.pdf](http://www.qsfp-dd.com/wp-content/uploads/2019/05/QSFP-DD-CMIS-rev4p0.pdf)
- [https://www.oiforum.com/documents/archived-non-oif-generated-specifications/](https://www.oiforum.com/documents/archived-non-oif-generated-specifications/)
- [https://apps.juniper.net/hct/model/?component=JCO400-QDD-ZR-M-HP](https://apps.juniper.net/hct/model/?component=JCO400-QDD-ZR-M-HP)
- [https://www.openzrplus.org/documents/](https://www.openzrplus.org/documents/)
- [https://www.adtran.com/en/products-and-services/open-optical-networking/fsp-3000-open-line-system](https://www.adtran.com/en/products-and-services/open-optical-networking/fsp-3000-open-line-system)
- [https://www.oiforum.com/wp-content/uploads/OIF-C-CMIS-01.3.pdf](https://www.oiforum.com/wp-content/uploads/OIF-C-CMIS-01.3.pdf)
- [https://www.itu.int/itu-t/recommendations/rec.aspx?rec=16153](https://www.itu.int/itu-t/recommendations/rec.aspx?rec=16153)

## Glossary

- 16QAM - 16-Quadrature Modulation
- 8QAM - 8-Quadrature Modulation
- BER -- Bit Error Rate
- CCC - Circuit cross-connect
- CMIS -- Common Management Interface Specification
- DSP -- Digital Signal Processor
- FER -- Frame Error Ratio
- GE -- Gigabit Ethernet
- IA  - Implementation Agreement
- L2circuit- Layer 2 circuit
- MPLS - Multiprotocol Label Switching
- MSA -- Multi Source Agreement
- OFEC -- Open FEC / Open Forward Error Correction
- OIF -- Optical Internetworking Forum
- PM -- Performance Monitoring
- Q-Margin -- Quality Margin
- QPSK - Quadrature Phase Shift Keying
- Q-Value -- Quality Value or Quality Factor
- Rx -- Receive
- Tx -- Transmit
- VDM - Versatile Diagnostics Monitoring
- VOA -- Variable Optical Attenuator

## Acknowledgements

- Moran Roth
- Nicolas Fevrier
- Dirk van den Borne
- Charles Park
- Ryan Holmes
