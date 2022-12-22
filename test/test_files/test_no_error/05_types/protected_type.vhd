package protected_Type_definition is
  type testPType is protected
    impure function Get return string;
  end protected testPType;
end package;
package body protected_Type_definition is
  type testPType is protected body
    impure function Get return string is
    begin
      return "a";
    end function;
  end protected body testPType;
end package body;



use work.protected_Type_definition.all;
use std.textio.all ;
entity ptype_user is
end entity;

architecture arch of ptype_user is
  function a (input: string) return string is
  begin
  return input;
  end function;
begin
  test_p : process
    variable testVar : testPType;
    variable buf     : line;
  begin

    report testVar.Get;  -- Here the method of testPType should be found
    write(buf, a(testVar.Get)); -- Here too, but the

  end process;
end architecture;
