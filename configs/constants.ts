// ------------------------    STATUS CODES    -------------------
export const STATUS_CODES = {
  // 1XX INFORMATIONAL
  CONTINUE: 100,
  SWITCHING_PROTOCOLS: 101,
  PROCESSING: 102,
  EARLY_HINTS: 103,

  // 2XX SUCCESS
  SUCCESS: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NON_AUTHORITATIVE_INFORMATION: 203,
  NO_CONTENT: 204,
  RESET_CONTENT: 205,
  PARTIAL_CONTENT: 206,
  MULTI_STATUS: 207,
  ALREADY_REPORTED: 208,
  IM_USED: 226,

  // 3XX REDIRECTION
  MULTIPLE_CHOICES: 300,
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  SEE_OTHER: 303,
  NOT_MODIFIED: 304,
  USE_PROXY: 305,
  TEMPORARY_REDIRECT: 307,
  PERMANENT_REDIRECT: 308,

  // 4XX CLIENT ERROR
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  PROXY_AUTHENTICATION_REQUIRED: 407,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  LENGTH_REQUIRED: 411,
  PRECONDITION_FAILED: 412,
  PAYLOAD_TOO_LARGE: 413,
  URI_TOO_LONG: 414,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RANGE_NOT_SATISFIABLE: 416,
  EXPECTATION_FAILED: 417,
  UN_PROCESSABLE_ENTITY: 422,
  VALIDATION_ERROR: 422,
  NOT_VALID_DATA: 422,
  LOCKED: 423,
  FAILED_DEPENDENCY: 424,
  UNORDERED_COLLECTION: 425,
  UPGRADE_REQUIRED: 426,
  PRECONDITION_REQUIRED: 428,
  TOO_MANY_REQUESTS: 429,
  REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
  UNAVAILABLE_FOR_LEGAL_REASONS: 451,

  // 5XX SERVER ERROR
  SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  HTTP_VERSION_NOT_SUPPORTED: 505,
  VARIANT_ALSO_NEGOTIATES: 506,
  INSUFFICIENT_STORAGE: 507,
  LOOP_DETECTED: 508,
  BANDWIDTH_LIMIT_EXCEEDED: 509,
  NOT_EXTENDED: 510,
  NETWORK_AUTHENTICATION_REQUIRED: 511,
};

export const STATUS_MESSAGE = {
  USER: {
    USER_LOGIN: "Login successful!",
    USER_INFO: "User data fetch successfully",
    USER_REGISTRATION: "Registration successful!",
    USER_PROFILE: "User profile fetched successfully",
    OTP_SEND: "OTP has been sent successfully. Please check your email.",
    OTP_VERIFIED: "OTP verified successfully",
    USER_UPDATED: "User profile updated successfully",
    NEWSLETTER_SUBSCRIBED: "Newsletter subscribed successfully",
    ERROR_MESSAGE: {
      ID_REQUIRED: "Customer Id required",
      PHONE_NUMBER_REQUIRED: "Phone number required",
      NAME_REQUIRED: "Name required",
      FIRST_NAME_REQUIRED: "First name required",
      EMAIL: "Invalid email formate",
      PASSWORD_REQUIRED: "Password required",
      EMAIL_REQUIRED: 'Email required',
      USER_ALREADY_EXIST: "The email address provided is already in use. Please provide a different email address.",
      USER_NOT_FOUND: "User not found",
      INVALID_CREDENTIAL: "Invalid email or password",
      OTP_REQUIRED: "OTP required",
      INVALID_OTP: "Invalid OTP",
      ALREADY_SUBSCRIBED: "Newsletter already subscribed",
    }
  },
  CUSTOMER_ADDRESS: {
    ADDRESS_CREATE: "Address created successfully",
    ADDRESS_UPDATE: "Address updated successfully",
    ADDRESS_DELETE: "Address deleted successfully",
    ADDRESS_LIST: "Address list fetched successfully",
    ADDRESS_DETAILS: "Address details fetched successfully",
    ADDRESS_STATUS_UPDATE: "Address status updated successfully",
    ERROR_MESSAGE: {
      ADDRESS_NOT_FOUND: "Address not found",
      ADDRESS_EXIST: "Address already exist",
      ADDRESS_REQUIRED: "Address required",
      ADDRESS_ID_REQUIRED: "Address Id required",
      ADDRESS_TYPE_REQUIRED: "Address type required",
      ADDRESS_TYPE_INVALID: "Invalid address type",
      DEFAULT_ADDRESS_ALREADY_SET: "Default address already set",
    }
  },
  PRODUCT: {
    PRODUCT_CREATE: "Product created successfully",
    PRODUCT_UPDATE: "Product updated successfully",
    PRODUCT_DELETE: "Product deleted successfully",
    PRODUCT_LIST: "Product list fetched successfully",
    PRODUCT_DETAILS: "Product details fetched successfully",
    ERROR_MESSAGE: {
      PRODUCT_NOT_FOUND: "Product not found",
      PRODUCT_EXIST: "Product already exist",
      PRODUCT_NAME_REQUIRED: "Product name required",
      PRODUCT_PRICE_REQUIRED: "Product price required",
      PRODUCT_DESCRIPTION_REQUIRED: "Product description required",
      PRODUCT_ID_REQUIRED: "Product Id required",
      PRODUCT_ID_OR_SLUG_REQUIRED: "Either 'product_id' or 'slug' is required to identify the product"
    }
  },
  COUPON: {
    COUPON_CREATE: "Coupon created successfully",
    COUPON_UPDATE: "Coupon updated successfully",
    COUPON_DELETE: "Coupon deleted successfully",
    COUPON_LIST: "Coupon list fetched successfully",
    COUPON_DETAILS: "Coupon details fetched successfully",
    COUPON_STATUS_UPDATE: "Coupon status updated successfully",
    ERROR_MESSAGE: {
      COUPON_NOT_FOUND: "Coupon not found",
      COUPON_EXIST: "Coupon already exist",
      CODE_REQUIRED: "Coupon code required",
      TITLE_REQUIRED: "Coupon title required",
      DISCOUNT_TYPE_INVALID: "Invalid discount type",
      CODE_EXISTS: "Coupon code already exists",
      VALUE_REQUIRED: "Coupon value required",
    }
  },
  NOTIFY_ME: {
    NOTIFY_ME_CREATE: "You're all set! We'll notify you as soon as it's available.",
    NOTIFY_ME_LIST: "Notify me list fetched successfully",
    ERROR_MESSAGE: {
      ALREADY_EXISTS: "You have already requested to be notified for this product.",
      NOTIFY_ME_NOT_FOUND: "Notify me not found",
      PRODUCT_ID_REQUIRED: "Product Id required",
      CUSTOMER_ID_REQUIRED: "Customer Id required",
      NOTIFY_ME_EXIST: "Notify me already exist",
      NOTIFY_ME_ID_REQUIRED: "Notify me Id required"
    }
  },
  BLOGS: {
    BLOG_CREATE: "Blog created successfully",
    BLOG_UPDATE: "Blog updated successfully",
    BLOG_DELETE: "Blog deleted successfully",
    BLOG_LIST: "Blog list fetched successfully",
    BLOG_DETAILS: "Blog details fetched successfully",
    ERROR_MESSAGE: {
      BLOG_NOT_FOUND: "Blog not found",
      BLOG_EXIST: "Blog already exist",
      BLOG_SLUG_EXIST: "Blog slug already exist",
      BLOG_DESCRIPTION_REQUIRED: "Blog description required",
      BLOG_TITLE_REQUIRED: "Blog title required",
      BLOG_ID_REQUIRED: "Blog Id required",
      BLOG_SLUG_REQUIRED: "Blog slug required"
    }
  },
  CART: {
    CART_CREATE: "Cart created successfully",
    CART_UPDATE: "Cart updated successfully",
    CART_DELETE: "Cart deleted successfully",
    CART_LIST: "Cart list fetched successfully",
    CART_DETAILS: "Cart details fetched successfully",
    CART_ITEM_DELETE: "Cart item deleted successfully",
    CART_GET: "Cart fetched successfully",
    ERROR_MESSAGE: {
      CART_NOT_FOUND: "Cart not found",
      CART_EXIST: "Cart already exist",
      CART_NAME_REQUIRED: "Cart name required",
      CART_PRICE_REQUIRED: "Cart price required",
      CART_DESCRIPTION_REQUIRED: "Cart description required",
      CART_ID_REQUIRED: "Cart Id required",
      PRODUCT_ID_REQUIRED: "Product Id required",
      QTY_REQUIRED: "Quantity required",
      CART_ITEM_EXIST: "Cart item already exist",
      CART_ITEM_NOT_FOUND: "Cart item not found",
      PRODUCT_NOT_FOUND: "Product not found",
    }
  },
  ACCOUNT: {
    CREATE_ACCOUNT: "Account created successfully",
  },
  VALIDATION: {
    USER: {
      INVALID_CREDENTIAL: "Invalid email or password",
    },
    TOKEN: {
      TOKEN_VALIDATION: "Invalid login token",
    },
    STATUS_REQUIRED: "Status required",
    STATUS_INVALID: "Invalid status",
    INTERNAL_SERVER_ERROR: "Internal Server Error"
  },
  DASHBOARD: {
    DASHBOARD_DATA: "Dashboard data fetched successfully",
  },
  ORDER: {
    PAYMENT_SUCCESS: "Payment Success",
    PAYMENT_INITIATED: "Payment Initiated",
    ORDER_HISTORY: "Order history fetched successfully",
    ERROR_MESSAGE: {
      ORDER_NOT_FOUND: "Order not found",
      CART_ID_REQUIRED: "Cart Id required",
      PAYMENT_FAILED: "Payment Failed",
      CART_NOT_FOUND: "Cart not found",
    }
  }
};

export const STATUS = {
  ACTIVE: 1,
  IN_ACTIVE: 2,
  DELETE: 3,
};
