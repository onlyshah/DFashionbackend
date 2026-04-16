/**
 * 📍 Address Controller
 * Handles user address CRUD operations for checkout and shipping
 */

const models = require('../../models_sql');

exports.createAddress = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, street, buildingName, city, state, zipCode, country, landmark, type, isDefault } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        statusCode: 401
      });
    }

    // Validation
    if (!firstName || !lastName || !phoneNumber || !street || !city || !state || !zipCode) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        errors: ['firstName, lastName, phoneNumber, street, city, state, zipCode are required'],
        statusCode: 400
      });
    }

    // If marking as default, unset default for other addresses
    if (isDefault) {
      await models.Address.findAll({
        where: { userId, isDefault: true }
      }).then(addresses => {
        addresses.forEach(addr => {
          addr.update({ isDefault: false });
        });
      });
    }

    const address = await models.Address.create({
      userId,
      firstName,
      lastName,
      phoneNumber,
      street,
      buildingName,
      city,
      state,
      zipCode,
      country: country || 'India',
      landmark,
      type: type || 'both',
      isDefault: isDefault || false
    });

    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      data: address,
      statusCode: 201
    });
  } catch (error) {
    console.error('❌ Create Address Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create address',
      errors: [error.message],
      statusCode: 500
    });
  }
};

exports.getAddresses = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        statusCode: 401
      });
    }

    const addresses = await models.Address.findAll({
      where: { userId, isActive: true },
      order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      message: 'Addresses retrieved successfully',
      data: addresses,
      statusCode: 200
    });
  } catch (error) {
    console.error('❌ Get Addresses Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve addresses',
      errors: [error.message],
      statusCode: 500
    });
  }
};

exports.getAddressById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        statusCode: 401
      });
    }

    const address = await models.Address.findOne({
      where: { id, userId }
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
        statusCode: 404
      });
    }

    res.status(200).json({
      success: true,
      message: 'Address retrieved successfully',
      data: address,
      statusCode: 200
    });
  } catch (error) {
    console.error('❌ Get Address By ID Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve address',
      errors: [error.message],
      statusCode: 500
    });
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { firstName, lastName, phoneNumber, street, buildingName, city, state, zipCode, country, landmark, type, isDefault } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        statusCode: 401
      });
    }

    const address = await models.Address.findOne({
      where: { id, userId }
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
        statusCode: 404
      });
    }

    // If marking as default, unset default for other addresses
    if (isDefault && !address.isDefault) {
      await models.Address.findAll({
        where: { userId, isDefault: true }
      }).then(addresses => {
        addresses.forEach(addr => {
          addr.update({ isDefault: false });
        });
      });
    }

    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (street) updateData.street = street;
    if (buildingName) updateData.buildingName = buildingName;
    if (city) updateData.city = city;
    if (state) updateData.state = state;
    if (zipCode) updateData.zipCode = zipCode;
    if (country) updateData.country = country;
    if (landmark) updateData.landmark = landmark;
    if (type) updateData.type = type;
    if (typeof isDefault === 'boolean') updateData.isDefault = isDefault;

    await address.update(updateData);

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: address,
      statusCode: 200
    });
  } catch (error) {
    console.error('❌ Update Address Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update address',
      errors: [error.message],
      statusCode: 500
    });
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        statusCode: 401
      });
    }

    const address = await models.Address.findOne({
      where: { id, userId }
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
        statusCode: 404
      });
    }

    // Soft delete
    await address.update({ isActive: false });

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
      statusCode: 200
    });
  } catch (error) {
    console.error('❌ Delete Address Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete address',
      errors: [error.message],
      statusCode: 500
    });
  }
};

exports.setDefaultAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        statusCode: 401
      });
    }

    const address = await models.Address.findOne({
      where: { id, userId }
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found',
        statusCode: 404
      });
    }

    // Unset default for other addresses
    await models.Address.findAll({
      where: { userId, isDefault: true }
    }).then(addresses => {
      addresses.forEach(addr => {
        addr.update({ isDefault: false });
      });
    });

    // Set this as default
    await address.update({ isDefault: true });

    res.status(200).json({
      success: true,
      message: 'Address set as default successfully',
      data: address,
      statusCode: 200
    });
  } catch (error) {
    console.error('❌ Set Default Address Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set default address',
      errors: [error.message],
      statusCode: 500
    });
  }
};
