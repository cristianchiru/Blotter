(function(Blotter, _, THREE, Detector, requestAnimationFrame, EventEmitter, GrowingPacker, setImmediate) {

  Blotter.MappingMaterial = function(mapping, material, shaderMaterial, userUniformDataTextureObjects) {
    this.mapping = mapping;
    this.material = material;
    this.shaderMaterial = shaderMaterial;

    this._userUniformDataTextureObjects = userUniformDataTextureObjects;

    this.init.apply(this, arguments);
  };

  Blotter.MappingMaterial.prototype = (function() {

    function _setValueAtIndexInDataTextureObject (value, i, dataTextureObject) {
      var type = dataTextureObject.userUniform.type,
          data = dataTextureObject.data;

      if (type == "1f") {
        data[4*i]   = value;    // x (r)
        data[4*i+1] = 0.0;
        data[4*i+2] = 0.0;
        data[4*i+3] = 0.0;
      } else if (type == "2f") {
        data[4*i]   = value[0]; // x (r)
        data[4*i+1] = value[1]; // y (g)
        data[4*i+2] = 0.0;
        data[4*i+3] = 0.0;
      } else if (type == "3f") {
        data[4*i]   = value[0]; // x (r)
        data[4*i+1] = value[1]; // y (g)
        data[4*i+2] = value[2]; // z (b)
        data[4*i+3] = 0.0;
      } else if (type == "4f") {
        data[4*i]   = value[0]; // x (r)
        data[4*i+1] = value[1]; // y (g)
        data[4*i+2] = value[2]; // z (b)
        data[4*i+3] = value[3]; // w (a)
      } else {
        data[4*i]   = 0.0;
        data[4*i+1] = 0.0;
        data[4*i+2] = 0.0;
        data[4*i+3] = 0.0;
      }
    }

    function _getUniformInterfaceForDataTextureObject (dataTextureObject) {
      var interface = {
        _type : dataTextureObject.userUniform.type,
        _value : dataTextureObject.userUniform.value,

        get value () {
          return this._value;
        },

        set value (v) {
          if (!Blotter.UniformUtils.validValueForUniformType(this._type, v)) {
            Blotter.Messaging.logError("Blotter.MappingMaterial", false, "uniform value not valid for uniform type: " + this._type);
            return;
          }
          this._value = v;

          this.trigger("update");
        }
      };

      _.extend(interface, EventEmitter.prototype);

      return interface;
    }

    function _getTextUniformInterface (mapping, userUniformDataTextureObjects) {
      return _.reduce(mapping.texts, function (memo, text, i) {
        memo[text.id] = _.reduce(userUniformDataTextureObjects, function (memo, dataTextureObject, uniformName) {
          memo[uniformName] = _getUniformInterfaceForDataTextureObject(dataTextureObject);

          memo[uniformName].on("update", function () {
            _setValueAtIndexInDataTextureObject(memo[uniformName].value, i, dataTextureObject);
            dataTextureObject.texture.needsUpdate = true;
          });

          memo[uniformName].value = dataTextureObject.userUniform.value;

          return memo;
        }, {});

        return memo;
      }, {});
    }

    function _getUniformInterface (mapping, userUniformDataTextureObjects) {
      return _.reduce(userUniformDataTextureObjects, _.bind(function (memo, dataTextureObject, uniformName) {
        memo[uniformName] = _getUniformInterfaceForDataTextureObject(dataTextureObject);

        memo[uniformName].on("update", _.bind(function () {
          _.each(mapping.texts, _.bind(function (text) {
            this.textUniformInterface[text.id][uniformName].value = memo[uniformName].value;
          }, this));
          dataTextureObject.texture.needsUpdate = true;
        }, this));

        return memo;
      }, this), {});
    }

    return {

      constructor : Blotter.MappingMaterial,

      get uniforms () {
        return this.material.uniforms;
      },

      get mainImage () {
        return this.material.mainImage;
      },

      get width () {
        return this.mapping.width;
      },

      get height () {
        return this.mapping.height;
      },

      get ratio () {
        return this.mapping.ratio;
      },

      init : function (mapping, material, shaderMaterial, userUniformDataTextureObjects) {
        this.textUniformInterface = _getTextUniformInterface.call(this, this.mapping, this._userUniformDataTextureObjects);
        this.uniformInterface = _getUniformInterface.call(this, this.mapping, this._userUniformDataTextureObjects);
      },

      boundsForText : function (text) {
        Blotter.Messaging.ensureInstanceOf(text, Blotter.Text, "Blotter.Text", "Blotter.MappingMaterial", "boundsForText");
        return this.mapping.boundsForText(text);
      }
    };
  })();

})(
  this.Blotter, this._, this.THREE, this.Detector, this.requestAnimationFrame, this.EventEmitter, this.GrowingPacker, this.setImmediate
);
