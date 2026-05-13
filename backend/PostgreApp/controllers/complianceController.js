/**
 * Compliance Controller - PostgreSQL/Sequelize Version
 * Data compliance, privacy, GDPR, policy enforcement
 * Methods: 6
 */

const { Op } = require('sequelize');
const models = require('../models');
const ApiResponse = require('../utils/ApiResponse');

exports.getComplianceStatus = async (req, res) => {
  try {
    const status = { compliant: true, issues: [] };
    return ApiResponse.success(res, status, 'Compliance status retrieved');
  } catch (error) {
    console.error('❌ getComplianceStatus error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getPrivacyPolicy = async (req, res) => {
  try {
    const policy = await models.CompliancePolicy.findOne({ where: { type: 'privacy' } });
    return policy ? ApiResponse.success(res, policy, 'Privacy policy retrieved') : ApiResponse.notFound(res, 'Policy');
  } catch (error) {
    console.error('❌ getPrivacyPolicy error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.updatePrivacyPolicy = async (req, res) => {
  try {
    const { content, version } = req.body;
    const [policy] = await models.CompliancePolicy.findOrCreate({ where: { type: 'privacy' } });
    await policy.update({ content, version });
    return ApiResponse.success(res, policy, 'Privacy policy updated');
  } catch (error) {
    console.error('❌ updatePrivacyPolicy error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.getUserConsent = async (req, res) => {
  try {
    const userId = req.user?.id;
    const consent = await models.UserConsent.findOne({ where: { userId } });
    return consent ? ApiResponse.success(res, consent, 'Consent retrieved') : ApiResponse.success(res, {}, 'No consent');
  } catch (error) {
    console.error('❌ getUserConsent error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.recordUserConsent = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { consentType, accepted } = req.body;
    const [consent] = await models.UserConsent.findOrCreate({ where: { userId } });
    await consent.update({ [consentType]: accepted, consentDate: new Date() });
    return ApiResponse.success(res, consent, 'Consent recorded');
  } catch (error) {
    console.error('❌ recordUserConsent error:', error);
    return ApiResponse.serverError(res, error);
  }
};

exports.deleteUserData = async (req, res) => {
  try {
    const userId = req.user?.id;
    await models.User.destroy({ where: { id: userId } });
    return ApiResponse.success(res, {}, 'User data deleted (GDPR)');
  } catch (error) {
    console.error('❌ deleteUserData error:', error);
    return ApiResponse.serverError(res, error);
  }
};


