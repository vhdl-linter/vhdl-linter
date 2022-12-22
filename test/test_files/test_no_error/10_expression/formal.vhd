-- vhdl-linter-disable unused
package formal is
end package;
package body formal is
  function bar(a : integer) return integer is
  begin
    return 5;
  end function;
  ------------------------------------------------------------
  function IgnoreBin (b : integer) return integer is
  ------------------------------------------------------------
  begin
    return bar(
      a => 2,
      b => b

      );
  end function IgnoreBin;
end package body;
