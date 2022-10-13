context work.test_contextA;

package deallocate_test_pkg_call_context is
  function test_func
    return boolean;

end package;
package body deallocate_test_pkg_call_context is

  function test_func

    return boolean is
    variable test : test_type;
  begin
    test := new test_type;
    deallocate (test);

  end function;


end package body;
