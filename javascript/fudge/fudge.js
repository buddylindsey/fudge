

fudge = {};

function AssertionError(msg) {
    Error.call(this, msg);
    this.name = "AssertionError";
    this.message = msg;
}
AssertionError.prototype.toString = function() { return this.message; }

fudge.registry = new function() {
    
    this.expected_calls = [];
    
    this.clear_actual_calls = function() {
        /*            
        def clear_actual_calls(self):
            for exp in self.get_this.expected_calls():
                exp.was_called = False
        */
        for (var i=0; i<this.expected_calls.length; i++) {
            var exp = this.expected_calls[i];
            exp.was_called = false;
        }
    };
    
    this.clear_all = function() {
        /*            
        def clear_all(self):
            self.clear_actual_calls()
            self.clear_expectations()
        */
        this.clear_actual_calls();
        this.clear_expectations();
    };
    
    this.clear_expectations = function() {
        /*            
        def clear_expectations(self):
            c = self.get_this.expected_calls()
            c[:] = []
        */
        this.expected_calls = [];
    };
    
    this.start = function() {
        /*
        def start(self):
            """Clears out any calls that were made on previously 
            registered fake objects.

            You do not need to use this directly.  Use fudge.start()
            """
            self.clear_actual_calls()
        */
        this.clear_actual_calls();
    };
    
    this.stop = function() {
        /*
        def stop(self):
            """Ensure all expected calls were called, 
            raise AssertionError otherwise.

            You do not need to use this directly.  Use fudge.stop()
            """
            try:
                for exp in self.get_this.expected_calls():
                    exp.assert_called()
            finally:
                self.clear_actual_calls()
        */
        for (var i=0; i<this.expected_calls.length; i++) {
            var exp = this.expected_calls[i];
            try {
                exp.assert_called();
            } catch (e) {
                this.clear_actual_calls();
                throw(e);
            }
        }
        this.clear_actual_calls();
    };
    
    this.expect_call = function(expected_call) {
        /*
        def expect_call(self, expected_call):
            c = self.get_this.expected_calls()
            c.append(expected_call)
        */
        this.expected_calls.push(expected_call);
    };
}

fudge.start = function() { return fudge.registry.start() };
fudge.stop = function() { return fudge.registry.stop() };
fudge.clear_expectations = function() { return fudge.registry.clear_expectations() };

function AnyCall(fake, call_name) {
    /*
    class Call(object):
        """A call that can be made on a Fake object.
    
        You do not need to use this directly, use Fake.provides(...), etc
        """
    */
    this.fake = fake;
    this.call_name = call_name;
    this.call_replacement = null;
    this.expected_arg_count = null;
    this.expected_kwarg_count = null;
    this.expected_args = null;
    this.expected_kwargs = null;
    this.return_val = null;
    this.was_called = false;
    
    var expector = this;
    this.fake._object[call_name] = function() {
        expector.was_called = true;
        return expector.return_val;
    }
};

AnyCall.prototype.__call__ = function() {
    /*
    def __call__(self, *args, **kwargs):
        self.was_called = True
        if self.call_replacement:
            return self.call_replacement(*args, **kwargs)
            
        if self.expected_args:
            if args != self.expected_args:
                raise AssertionError(
                    "%s was called unexpectedly with args %s" % (self, args))
        elif self.expected_arg_count is not None:
            if len(args) != self.expected_arg_count:
                raise AssertionError(
                    "%s was called with %s arg(s) but expected %s" % (
                        self, len(args), self.expected_arg_count))
                    
        if self.expected_kwargs:
            if kwargs != self.expected_kwargs:
                raise AssertionError(
                    "%s was called unexpectedly with keyword args %s" % (
                                self, ", ".join(fmt_dict_vals(kwargs))))
        elif self.expected_kwarg_count is not None:
            if len(kwargs.keys()) != self.expected_kwarg_count:
                raise AssertionError(
                    "%s was called with %s keyword arg(s) but expected %s" % (
                        self, len(kwargs.keys()), self.expected_kwarg_count))
        
        return self.return_val
    */
}

 // can be called, but doesn't do anything
AnyCall.prototype.assert_called = function() {};

function ExpectedCall(fake, call_name) {
    AnyCall.call(this, fake, call_name);
}

ExpectedCall.prototype.assert_called = function() {
    /*
    def assert_called(self):
        if not self.was_called:
            raise AssertionError("%s was not called" % (self))
    */
    if (!this.was_called) {
        throw(new AssertionError(this.fake._name + "." + this.call_name + "() was not called"));
    }
}

function Fake(name, config) {
    /*
    class Fake(object):
        """A fake object to replace a real one while testing.
    
        All calls return ``this`` so that you can chain them together to 
        create readable code.
    
        Arguments:
    
        name
            Name of the JavaScript global to replace.
    
        config.allows_any_call = false
            When True, any method is allowed to be called on the Fake() instance.  Each method 
            will be a stub that does nothing if it has not been defined.  Implies callable=True.

        config.callable = false
            When True, the Fake() acts like a callable.  Use this if you are replacing a single 
            method.
    
        Short example::
    
            >>> import fudge
            >>> auth = Fake('auth').expects('login').with_args('joe_username', 'joes_password')
            >>> fudge.clear_expectations()
        
        """
    */
    if (!config) {
        config = {};
    }
    this._name = name;
    
    if (name) {
        var parts = name.split(".");
        if (parts.length==0) {
            // empty string?
            throw new Error("Fake('" + name + "'): invalid name");
        }   
        // descend into dot-separated object.
        //  i.e.
        //  foo.bar.baz
        //      window[foo]
        //      foo[bar]
        //      baz
        var last_parent = window;
        for (var i=0; i<parts.length; i++) {
            var new_part = parts[i];
            if (!last_parent[new_part]) {
                // lazily create mock objects that don't exist:
                last_parent[new_part] = {};
            }
            last_parent = last_parent[new_part];
        }
        this._object = last_parent;
    
        if (!this._object) {
            throw new Error(
                "Fake('" + name + "'): name must be the name of a " + 
                "global variable assigned to window (it is: " + this._object + ")");
        }
    } else {
        // anonymous Fake, like for returns_fake()
        this._object = {};
    }
    
    this._declared_calls = {};
    this._last_declared_call_name = null;
    this._allows_any_call = config.allows_any_call;
    this._stub = null;
    this._callable = config.callable || config.allows_any_call;
}

Fake.prototype.__getattr__ = function(name) {
    /*
    def __getattr__(self, name):
        if name in self._declared_calls:
            return self._declared_calls[name]
        else:
            if self._allows_any_call:
                return Call(self, call_name=name)
            raise AttributeError("%s object does not allow call or attribute '%s'" % (
                                    self, name))
    */
}

Fake.prototype.__call__ = function() {
    /*
    def __call__(self, *args, **kwargs):
        if '__init__' in self._declared_calls:
            # special case, simulation of __init__():
            call = self._declared_calls['__init__']
            call(*args, **kwargs)
            return self
        elif self._callable:
            # go into stub mode:
            if not self._stub:
                self._stub = Call(self)
            call = self._stub
            return call(*args, **kwargs)
        else:
            raise RuntimeError("%s object cannot be called (maybe you want %s(callable=True) ?)" % (
                                                                        self, self.__class__.__name__))
    */
}

Fake.prototype._get_current_call = function() {
    /*
    def _get_current_call(self):
        if not self._last_declared_call_name:
            if not self._stub:
                self._stub = Call(self)
            return self._stub
        exp = self._declared_calls[self._last_declared_call_name]
        return exp
    */
    if (!this._last_declared_call_name) {
        if (!this._stub) {
            this._stub = AnyCall(this);
        }
        return this._stub;
    }
    return this._declared_calls[this._last_declared_call_name];
}

Fake.prototype.calls = function(call) {
    /*
    def calls(self, call):
        """Redefine a call."""
        exp = self._get_current_call()
        exp.call_replacement = call
        return self
    */
}

Fake.prototype.expects = function(call_name) {
    /*
    def expects(self, call_name):
        """Expect a call."""
        self._last_declared_call_name = call_name
        c = ExpectedCall(self, call_name)
        self._declared_calls[call_name] = c
        registry.expect_call(c)
        return self
    */
    this._last_declared_call_name = call_name;
    var c = new ExpectedCall(this, call_name);
    this._declared_calls[call_name] = c;
    fudge.registry.expect_call(c);
    return this;
}

Fake.prototype.provides = function(call_name) {
    /*
    def provides(self, call_name):
        """Provide a call."""
        self._last_declared_call_name = call_name
        c = Call(self, call_name)
        self._declared_calls[call_name] = c
        return self
    */
}

Fake.prototype.returns = function(val) {
    /*
    def returns(self, val):
        """Return a value."""
        exp = self._get_current_call()
        exp.return_val = val
        return self
    */
    var exp = this._get_current_call();
    exp.return_val = val;
    return this;
}

Fake.prototype.returns_fake = function() {
    /*
    def returns_fake(self):
        """Return a fake."""
        exp = self._get_current_call()
        fake = self.__class__()
        exp.return_val = fake
        return fake
    */
    return this.returns(new Fake());
}

Fake.prototype.with_args = function() {
    /*
    def with_args(self, *args, **kwargs):
        """Expect specific arguments."""
        exp = self._get_current_call()
        if args:
            exp.expected_args = args
        if kwargs:
            exp.expected_kwargs = kwargs
        return self
    */
}

Fake.prototype.with_arg_count = function(count) {
    /*
    def with_arg_count(self, count):
        """Expect an exact argument count."""
        exp = self._get_current_call()
        exp.expected_arg_count = count
        return self
    */
}

Fake.prototype.with_kwarg_count = function(count) {  
    /*
    def with_kwarg_count(self, count):
        """Expect an exact count of keyword arguments."""
        exp = self._get_current_call()
        exp.expected_kwarg_count = count
        return self
    */
}