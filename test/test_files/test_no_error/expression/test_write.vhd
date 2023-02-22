package test_write is

end package;
package body test_write is
  procedure RemoveExclude(
    a_unused : boolean
    ) is
    variable NewA : integer_vector(0 to 5);
    alias norm_NewA : integer_vector(1 to NewA'length) is NewA;
  begin
    norm_NewA(0) := 0;
  end procedure RemoveExclude;

end package body;
