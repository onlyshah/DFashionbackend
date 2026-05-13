/**
 * 📍 Address Controller - PostgreSQL/Sequelize Version
 * Handles user address CRUD operations for checkout and shipping
 * Methods: 6
 */

const { Op } = require('sequelize');
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

exports.createAddress = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, street, buildingName, city, state, zipCode, country, landmark, type, isDefault } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, 'User not authenticated', 401);
    }

    if (!firstName || !lastName || !phoneNumber || !street || !city || !state || !zipCode) {
      return ApiResponse.error(res, 'Missing required fields: firstName, lastName, phoneNumber, street, city, state, zipCode', 422);
    }

    if (isDefault) {
      await models.Address.update({ isDefault: false }, { where: { userId, isDefault: true } });
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

    return ApiResponse.created(res, address, 'Address created successfully');
  } catch (error) {
    console.error('❌ createAddress error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getAddresses = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, 'User not authenticated', 401);
    }

    const addresses = await models.Address.findAll({
      where: { userId, isActive: true },
      order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
    });

    return ApiResponse.success(res, addresses, 'Addresses retrieved successfully');
  } catch (error) {
    console.error('❌ getAddresses error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getAddressById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, 'User not authenticated', 401);
    }

    const address = await models.Address.findOne({
      where: { id, userId }
    });

    if (!address) {
      return ApiResponse.notFound(res, 'Address');
    }

    return ApiResponse.success(res, address, 'Address retrieved successfully');
  } catch (error) {
    console.error('❌ getAddressById error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { firstName, lastName, phoneNumber, street, buildingName, city, state, zipCode, country, landmark, type, isDefault } = req.body;

    if (!userId) {
      return ApiResponse.error(res, 'User not authenticated', 401);
    }

    const address = await models.Address.findOne({
      where: { id, userId }
    });

    if (!address) {
      return ApiResponse.notFound(res, 'Address');
    }

    if (isDefault && !address.isDefault) {
      await models.Address.update({ isDefault: false }, { where: { userId, isDefault: true } });
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

    return ApiResponse.success(res, address, 'Address updated successfully');
  } catch (error) {
    console.error('❌ updateAddress error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, 'User not authenticated', 401);
    }

    const address = await models.Address.findOne({
      where: { id, userId }
    });

    if (!address) {
      return ApiResponse.notFound(res, 'Address');
    }

    await address.update({ isActive: false });

    return ApiResponse.success(res, {}, 'Address deleted successfully');
  } catch (error) {
    console.error('❌ deleteAddress error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.setDefaultAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return ApiResponse.error(res, 'User not authenticated', 401);
    }

    const address = await models.Address.findOne({
      where: { id, userId }
    });

    if (!address) {
      return ApiResponse.notFound(res, 'Address');
    }

    await models.Address.update({ isDefault: false }, { where: { userId } });
    await address.update({ isDefault: true });

    return ApiResponse.success(res, address, 'Default address updated successfully');
  } catch (error) {
    console.error('❌ setDefaultAddress error:', error);
    return ApiResponse.serverError(res, error);
  }
};


