import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  HAP,
  Logging,
  Service
} from "homebridge";
import axios, { AxiosResponse } from "axios";



let hap: HAP;

/*
 * Initializer function called when the plugin is loaded.
 */
export = (api: API) => {
  hap = api.hap;
  api.registerAccessory("MedionVacuumCleaner", MedionVacuumCleaner);
};

class MedionVacuumCleaner implements AccessoryPlugin {

  private readonly log: Logging;
  private readonly name: string;

  private readonly vacuumService: Service;
  private readonly informationService: Service;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;
    this.vacuumService = new hap.Service.Switch(this.name); // There's no definition for Vacuum cleaners in Homekit, have to use other service with similar Characteristic
    this.vacuumService.getCharacteristic(hap.Characteristic.On)
      .on(CharacteristicEventTypes.GET, async (callback: CharacteristicGetCallback) => {
        // This is called to get the current status of the Vacuum Cleaner, 
        // going to check the status URL, if it's charging going to return OFF (false).
        let status = false;
        try {
          const response = await axios.get(config.statusUrl);
          if(response.status == 200) {
            status = response.data.charging !== "charging";
          } else {
            log.error(`Status URL returned error: ${response.statusText}`);
          }
        } catch(error) {
          log.error("Failed to get the status");
        }
        log.info("Current state of the vacuum was returned: " + (status? "Cleaning": "Charging"));
        callback(undefined, status);
      })
      .on(CharacteristicEventTypes.SET, async (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        // This is called to set the status of the Vacuum Cleaner, 
        // going to call the "action" URLs.
        const url = (value as boolean) ? config.cleanUrl : config.chargeUrl;
        try {
          const response = await axios.get(url);
          if(response.status == 200) {
            log.info("Switch state was set to: " + ((value as boolean)? "Clean": "Charge"));
          } else {
            log.error(`${url} returned error: ${response.statusText}`);
          }
        } catch (error) {
          log.error("Failed to get the status");
        }
        callback();
      });

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, "Medion")
      .setCharacteristic(hap.Characteristic.Model, "Vacuum Cleaner");

    log.info("Vacuum cleaner finished initializing!");
  }

  /*
   * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
   * Typical this only ever happens at the pairing process.
   */
  identify(): void {
    this.log("Identify!");
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [
      this.informationService,
      this.vacuumService,
    ];
  }
}
