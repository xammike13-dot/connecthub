import SystemSetting from '../models/SystemSetting.js';
import { getIO } from '../utils/socket.js';

/**
 * @desc    Get current public platform status (e.g. maintenance mode)
 * @route   GET /api/settings/status
 * @access  Public
 */
export const getPlatformStatus = async (req, res) => {
  try {
    let setting = await SystemSetting.findOne({ key: 'platform_config' });

    if (!setting) {
      setting = await SystemSetting.create({
        key: 'platform_config',
        maintenanceMode: false,
      });
    }

    return res.status(200).json({
      success: true,
      maintenanceMode: Boolean(setting.maintenanceMode),
      updatedAt: setting.updatedAt,
    });
  } catch (error) {
    console.error('[Settings] getPlatformStatus error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving system status',
      maintenanceMode: false,
    });
  }
};

/**
 * @desc    Toggle or update maintenance mode
 * @route   PATCH /api/settings/maintenance
 * @access  Private (Admin only)
 */
export const updateMaintenanceMode = async (req, res) => {
  try {
    const { maintenanceMode } = req.body;

    if (typeof maintenanceMode !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Field "maintenanceMode" (boolean) is required.',
      });
    }

    const setting = await SystemSetting.findOneAndUpdate(
      { key: 'platform_config' },
      {
        maintenanceMode,
        updatedBy: req.user?._id || null,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    // Emit live Socket.IO event to all connected clients
    const io = getIO() || global.io || req.app?.get('io');
    if (io) {
      io.emit('system:maintenance_updated', {
        maintenanceMode: setting.maintenanceMode,
        updatedAt: setting.updatedAt,
      });
      console.log(`[Socket] Broadcasted system:maintenance_updated -> ${setting.maintenanceMode}`);
    }

    return res.status(200).json({
      success: true,
      message: `Maintenance mode ${setting.maintenanceMode ? 'enabled' : 'disabled'} successfully`,
      maintenanceMode: setting.maintenanceMode,
      updatedAt: setting.updatedAt,
    });
  } catch (error) {
    console.error('[Settings] updateMaintenanceMode error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating maintenance mode',
    });
  }
};
