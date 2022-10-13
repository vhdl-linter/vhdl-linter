use work.deallocate_test_pkg_def.all;

package deallocate_test_pkg_call is
  function test_func
    return boolean;

end package;
package body deallocate_test_pkg_call is

  function test_func

    return boolean is
    variable test : test_type;
  begin
    test := new test_type;
    deallocate (test);

  end function;


end package body;
