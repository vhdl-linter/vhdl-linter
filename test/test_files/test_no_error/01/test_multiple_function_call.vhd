package test_multiple_function_call is

end package;
package body test_multiple_function_call is
  procedure dummy(
    foo_i : in  boolean;
    bar_o : out boolean)
  is
  begin
    bar_o := not foo_i;
  end procedure;


  function dummy_2 (
    foo : boolean
    )
    return boolean
  is
    variable bar : boolean;
  begin

    -- No error should come here:
    dummy (foo, bar);

    dummy (foo, bar);
    return bar;
  end function;
end package body;
