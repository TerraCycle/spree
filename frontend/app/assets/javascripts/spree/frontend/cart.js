//= require spree/frontend/coupon_manager

Spree.ready(function ($) {
  let formUpdateCart = $('form#update-cart')

  function buildEventTriggerObject(dataset, quantity) {
    if (!dataset || !quantity) return false

    let triggerObject = {
      type: 'product_remove_from_cart',
      variant_name: dataset.variantName,
      variant_options: dataset.variantOptions,
      variant_price: dataset.variantPrice,
      variant_quantity: quantity,
      variant_sku: dataset.variantSku,
    }

    return triggerObject
  }

  if (formUpdateCart.length) {
    let clearInvalidCouponField = function() {
      let couponCodeField = $('#order_coupon_code')
      let couponStatus = $('#coupon_status')
      if (!!couponCodeField.val() && couponStatus.hasClass('alert-error')) {
        couponCodeField.val('')
      }
    }

    formUpdateCart.find('a.delete').show().one('click', function (event) {
      let itemId = $(this).attr('data-id')
      let link = $(event.currentTarget)
      let quantityInputs = $(`form#update-cart input.shopping-cart-item-quantity-input[data-id='${itemId}']`)
      let quantity = $(quantityInputs).val()
      $(this).parents('.shopping-cart-item').first().find('input.shopping-cart-item-quantity-input').val(0)
      clearInvalidCouponField()
      if (link[0] && link[0].dataset && quantity) {
        link.trigger(buildEventTriggerObject(link[0].dataset, quantity))
      }
      formUpdateCart.submit()
      return false
    })
    formUpdateCart.find('input.shopping-cart-item-quantity-input').on('keyup', function(e) {
      let itemId = $(this).attr('data-id')
      let value = $(this).val()
      let newValue = isNaN(value) || value === '' ? value : parseInt(value, 10)
      let targetInputs = $(`form#update-cart input.shopping-cart-item-quantity-input[data-id='${itemId}']`)
      $(targetInputs).val(newValue)
    })
    formUpdateCart.find('input.shopping-cart-item-quantity-input').on('change', function(e) {
      if ($(this).val() < 10000) {
        clearInvalidCouponField()
        formUpdateCart.submit()
      }
    })
    formUpdateCart.find('button.shopping-cart-item-quantity-decrease-btn').off('click').on('click', function() {
      let itemId = $(this).attr('data-id')
      let input = $(`input[data-id='${itemId}']`)
      let inputValue = parseInt($(input).val(), 10)

      if (inputValue > 1) {
        $(input).val(inputValue - 1)
        clearInvalidCouponField()
        formUpdateCart.submit()
      }
    })
    formUpdateCart.find('button.shopping-cart-item-quantity-increase-btn').off('click').on('click', function() {
      let itemId = $(this).attr('data-id')
      let input = $(`input[data-id='${itemId}']`)
      let inputValue = parseInt($(input).val(), 10)

      $(input).val(inputValue + 1)
      clearInvalidCouponField()
      formUpdateCart.submit()
    })
    formUpdateCart.find('button#shopping-cart-coupon-code-button').off('click').on('click', function(event) {
      let couponCodeField = $('#order_coupon_code')

      window.applyingCoupon = true

      if (!$.trim(couponCodeField.val()).length) {
        window.applyingCoupon = false
        event.preventDefault()
        return false
      }
    })

    formUpdateCart.find('button#shopping-cart-remove-coupon-code-button').off('click').on('click', function(event) {
      let input = {
        appliedCouponCodeField: $('#order_applied_coupon_code'),
        couponCodeField: $('#order_coupon_code'),
        couponStatus: $('#coupon_status'),
        couponButton: $('#shopping-cart-coupon-code-button'),
        removeCouponButton: $('#shopping-cart-remove-coupon-code-button')
      }

      if (new CouponManager(input).removeCoupon()) {
        return true
      } else {
        event.preventDefault()
        return false
      }
    })
  }
  formUpdateCart.submit(function (event) {
    let input = {
      couponCodeField: $('#order_coupon_code'),
      couponStatus: $('#coupon_status'),
      couponButton: $('#shopping-cart-coupon-code-button')
    }
    let updateButton = formUpdateCart.find('#update-button')
    updateButton.attr('disabled', true)
    if ($.trim(input.couponCodeField.val()).length > 0 && window.applyingCoupon) {
      window.applyingCoupon = false
      // eslint-disable-next-line no-undef
      if (new CouponManager(input).applyCoupon()) {
        input.couponCodeField.removeClass('error')
        input.couponButton.removeClass('error')
        this.submit()
        return true
      } else {
        updateButton.attr('disabled', false)
        event.preventDefault()
        return false
      }
    }
  })

  if (!Spree.cartFetched) Spree.fetchCart()
})

Spree.fetchCart = function () {
  return $.ajax({
    url: Spree.pathFor('cart_link')
  }).done(function (data) {
    Spree.cartFetched = true
    return $('#link-to-cart').html(data)
  })
}

Spree.ensureCart = function (successCallback) {
  if (SpreeAPI.orderToken) {
    successCallback()
  } else {
    fetch(Spree.routes.ensure_cart, {
      method: 'POST',
      credentials: 'same-origin'
    }).then(function (response) {
      switch (response.status) {
        case 200:
          response.json().then(function (json) {
            SpreeAPI.orderToken = json.token
            successCallback()
          })
          break
      }
    })
  }
}
