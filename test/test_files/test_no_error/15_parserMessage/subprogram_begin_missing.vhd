package subprogram_begin_missing is

end package;
package body subprogram_begin_missing is
  procedure RemoveExclude(
    a_unused : boolean
    ) is
    variable NewA   : integer_vector(0 to 5);
    alias norm_NewA : integer_vector(1 to NewA'length) is NewA;
    -- begin
    norm_NewA(0) := 0;                  -- vhdl-linter-disable-line parser
  end procedure RemoveExclude;


  procedure RemoveExclude(
    a_unused : boolean
    ) is

    -- begin
    report integer'image(5);
  end procedure RemoveExclude;

end package body;
