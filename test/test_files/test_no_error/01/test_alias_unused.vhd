package test_alias_unused is

end package;
package body test_alias_unused is
  procedure RemoveExclude(
    ) is
    variable NewA : integer_vector;
    alias norm_NewA : integer_vector(1 to NewA'length) is NewA;
  begin
    norm_NewA(0) <= 0;
  end procedure RemoveExclude;
  procedure RemoveExclude(
    variable NewA : out integer_vector
    ) is
    alias norm_NewA : integer_vector(1 to NewA'length) is NewA;
  begin
    norm_NewA(0) <= 0;
  end procedure RemoveExclude;
end package body;
