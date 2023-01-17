package exit_in_procedure is

end package;
package body exit_in_procedure is
  procedure ReadSpecification is
    variable Empty : boolean; -- vhdl-linter-disable-line unused
  begin

    ReadLoop : loop
      exit ReadLoop when Empty; -- references loop
    end loop;
  end procedure;
end package body;
