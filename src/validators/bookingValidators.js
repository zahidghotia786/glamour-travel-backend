// validators/bookingValidators.js
const { body } = require('express-validator');

const bookingValidators = [
  body('uniqueNo')
    .isInt({ min: 1 })
    .withMessage('uniqueNo must be a positive integer'),
  
  body('TourDetails')
    .isArray({ min: 1 })
    .withMessage('TourDetails must be a non-empty array'),
  
  body('TourDetails.*.serviceUniqueId')
    .isInt({ min: 1, max: 999999 })
    .withMessage('serviceUniqueId must be a 6-digit integer'),
  
  body('TourDetails.*.tourId')
    .isInt({ min: 1 })
    .withMessage('tourId must be a positive integer'),
  
  body('TourDetails.*.optionId')
    .isInt({ min: 1 })
    .withMessage('optionId must be a positive integer'),
  
  body('TourDetails.*.adult')
    .isInt({ min: 0 })
    .withMessage('adult must be a non-negative integer'),
  
  body('TourDetails.*.child')
    .isInt({ min: 0 })
    .withMessage('child must be a non-negative integer'),
  
  body('TourDetails.*.infant')
    .isInt({ min: 0 })
    .withMessage('infant must be a non-negative integer'),
  
  body('TourDetails.*.tourDate')
    .isISO8601()
    .withMessage('tourDate must be a valid date'),
  
  body('TourDetails.*.adultRate')
    .isFloat({ min: 0 })
    .withMessage('adultRate must be a positive number'),
  
  body('TourDetails.*.childRate')
    .isFloat({ min: 0 })
    .withMessage('childRate must be a positive number'),
  
  body('TourDetails.*.serviceTotal')
    .isFloat({ min: 0 })
    .withMessage('serviceTotal must be a positive number'),
  
  body('passengers')
    .isArray({ min: 1 })
    .withMessage('passengers must be a non-empty array'),
  
  body('passengers.*.email')
    .isEmail()
    .withMessage('Invalid email format'),
  
  body('passengers.*.mobile')
    .isMobilePhone()
    .withMessage('Invalid mobile number'),
  
  body('passengers.*.prefix')
    .isIn(['Mr.', 'Ms.', 'Mrs.'])
    .withMessage('prefix must be Mr., Ms., or Mrs.'),
  
  body('passengers.*.paxType')
    .isIn(['Adult', 'Child', 'Infant'])
    .withMessage('paxType must be Adult, Child, or Infant')
];

const ticketValidators = [
  body('uniqNO')
    .isInt({ min: 1 })
    .withMessage('uniqNO must be a positive integer'),
  
  body('referenceNo')
    .notEmpty()
    .withMessage('referenceNo is required'),
  
  body('bookedOption')
    .isArray({ min: 1 })
    .withMessage('bookedOption must be a non-empty array'),
  
  body('bookedOption.*.serviceUniqueId')
    .notEmpty()
    .withMessage('serviceUniqueId is required'),
  
  body('bookedOption.*.bookingId')
    .isInt({ min: 1 })
    .withMessage('bookingId must be a positive integer')
];

const cancellationValidators = [
  body('bookingId')
    .isInt({ min: 1 })
    .withMessage('bookingId must be a positive integer'),
  
  body('referenceNo')
    .notEmpty()
    .withMessage('referenceNo is required'),
  
  body('cancellationReason')
    .notEmpty()
    .withMessage('cancellationReason is required')
];

module.exports = {
  bookingValidators,
  ticketValidators,
  cancellationValidators
};